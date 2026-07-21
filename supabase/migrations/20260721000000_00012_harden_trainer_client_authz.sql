-- ============================================================
-- Migration 00012: Harden trainer_clients connection authz
-- BUG-019 (Class B). Closes a HIGH cross-user data-exposure
-- hole in the 00002 trainer<->client spine.
--
-- Root causes fixed here:
--   1. are_connected() ignored `status` — even a 'pending'
--      (unaccepted) link granted full read of the victim's
--      workouts / personal_bests / client_exercise_history /
--      profile.
--   2. tc_insert_trainer only checked trainer_id = auth.uid(),
--      so any user could self-name as trainer and insert an
--      ARBITRARY victim as client, then read their data.
--
-- Fix (uses the EXISTING `status` column only — the full
-- token-scoped `invitations` table is a separate invites-flag
-- feature, auth-schema-followon, NOT built here):
--   - are_connected() counts ONLY status = 'active' links.
--   - A trainer may only CREATE a 'pending' link.
--   - Only the CLIENT may move a link into 'active' (accept),
--     or decline it. Enforced by a BEFORE trigger because a
--     WITH CHECK clause cannot compare OLD vs NEW.
--   - A trainer keeps UPDATE (edit historical_offset_sessions,
--     archive/deactivate) but CANNOT flip status to 'active'.
--
-- ROLLBACK:
--   drop trigger if exists trainer_clients_guard_activate on public.trainer_clients;
--   drop function if exists public.tc_guard_activate();
--   drop policy if exists tc_update_client on public.trainer_clients;
--   drop policy if exists tc_insert_trainer on public.trainer_clients;
--   create policy tc_insert_trainer on public.trainer_clients for insert to authenticated
--     with check (trainer_id = auth.uid());
--   create or replace function public.are_connected(_a uuid, _b uuid)
--   returns boolean language sql security definer stable set search_path = public as $$
--     select exists (select 1 from public.trainer_clients tc
--       where (tc.trainer_id = _a and tc.client_id = _b)
--          or (tc.trainer_id = _b and tc.client_id = _a));
--   $$;
-- ============================================================

-- ------------------------------------------------------------
-- 1. are_connected(): only ACTIVE links count. A pending /
--    inactive / archived link now leaks nothing (this helper
--    backs users_select_self_or_connected + the *_select_self_or_trainer
--    policies on workouts / personal_bests / client_exercise_history).
-- ------------------------------------------------------------
create or replace function public.are_connected(_a uuid, _b uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.trainer_clients tc
    where tc.status = 'active'
      and ((tc.trainer_id = _a and tc.client_id = _b)
        or (tc.trainer_id = _b and tc.client_id = _a))
  );
$$;

-- ------------------------------------------------------------
-- 2. Insert: a trainer may only create a PENDING link for
--    themselves. No self-activated link is possible.
-- ------------------------------------------------------------
drop policy tc_insert_trainer on public.trainer_clients;

create policy tc_insert_trainer
  on public.trainer_clients for insert
  to authenticated
  with check (trainer_id = auth.uid() and status = 'pending');

-- ------------------------------------------------------------
-- 3. Client UPDATE policy: the client owns accept/decline of
--    their own link. tc_update_trainer (trainer edits offset /
--    archives) is left intact from 00002.
-- ------------------------------------------------------------
create policy tc_update_client
  on public.trainer_clients for update
  to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

-- ------------------------------------------------------------
-- 4. Activate-guard trigger: only the CLIENT may transition a
--    link INTO 'active'. A WITH CHECK cannot compare OLD vs NEW,
--    so enforce it here. SECURITY DEFINER so it always runs;
--    auth.uid() still reflects the calling user (read from the
--    request JWT claims, not the function owner).
-- ------------------------------------------------------------
create or replace function public.tc_guard_activate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Link parties are immutable. Neither policy's WITH CHECK can compare OLD
  -- vs NEW, so a party could otherwise repoint an existing link at a victim
  -- (client sets trainer_id = victim then self-activates; or trainer sets
  -- client_id = victim on an already-active link, which the activate check
  -- below misses because status stays 'active') and gain a read connection.
  if tg_op = 'UPDATE'
     and (new.trainer_id <> old.trainer_id or new.client_id <> old.client_id) then
    raise exception 'trainer_clients link parties are immutable; delete and re-invite instead'
      using errcode = 'check_violation';
  end if;

  if new.status = 'active'
     and old.status is distinct from 'active'
     and auth.uid() <> new.client_id then
    raise exception 'Only the client may activate a trainer_clients link'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger trainer_clients_guard_activate
  before insert or update on public.trainer_clients
  for each row execute function public.tc_guard_activate();
