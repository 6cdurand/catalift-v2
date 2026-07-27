-- ============================================================
-- Migration 00013: Reconcile repo <-> prod (schema drift codification)
--
-- PURPOSE (repo==prod, NOT a behaviour change): several objects
-- exist in the LIVE v2 project but never went through a repo
-- migration. This migration codifies that live-only state so the
-- repo is the source of truth. Every statement is IDEMPOTENT:
-- applying this to the live DB (which already has all of this)
-- is a NO-OP — no error, no data change.
--
-- Live-only objects codified here (verified against live
-- igagmdkdzjkxrwnyvgqk on 2026-07-22; diffed against repo
-- supabase/migrations/ — none of the below were present):
--   (2a) public.invitations table + RLS + invitations_trainer_all
--        policy  (shipped to live via PR #45; QA finding #81 drift)
--   (2b) public.accept_invitation(text) / public.verify_invitation(text)
--   (2c) BUG-019 advisor revoke on public.tc_guard_activate() that the
--        merged 00012 omitted (live ACL = postgres | service_role only)
--
-- The invitations FKs to public.users(id) are reproduced from the
-- live generated types (invitations_trainer_id_fkey,
-- invitations_accepted_user_fkey). They are created VALIDATED
-- (no NOT VALID — AGENTS rule 2). ON DELETE is left as the SQL
-- default (NO ACTION); live-apply is a no-op regardless.
--
-- ROLLBACK:
--   drop function if exists public.verify_invitation(text);
--   drop function if exists public.accept_invitation(text);
--   drop policy if exists invitations_trainer_all on public.invitations;
--   drop table if exists public.invitations;
--   -- (2c) re-grant is intentionally NOT part of rollback: leaving
--   --      EXECUTE revoked is the safe state. To undo explicitly:
--   --      grant execute on function public.tc_guard_activate() to authenticated;
-- ============================================================

-- ------------------------------------------------------------
-- 2a. invitations table (token-scoped trainer->client invites).
--     `create table if not exists` => no-op on live.
-- ------------------------------------------------------------
create table if not exists public.invitations (
  id            uuid        not null default gen_random_uuid(),
  trainer_id    uuid        not null,
  email         text        not null,
  token         text        not null,
  role          text        not null default 'client',
  status        text        not null default 'pending',
  expires_at    timestamptz not null default (now() + interval '7 days'),
  accepted_at   timestamptz,
  accepted_user uuid,
  created_at    timestamptz not null default now(),
  constraint invitations_pkey primary key (id),
  constraint invitations_trainer_id_fkey
    foreign key (trainer_id) references public.users(id),
  constraint invitations_accepted_user_fkey
    foreign key (accepted_user) references public.users(id)
);

-- Idempotent: no-op if already enabled.
alter table public.invitations enable row level security;

-- CREATE POLICY has no IF NOT EXISTS; drop-then-create is idempotent.
-- Trainer-only: a trainer manages ONLY their own invitations. Clients
-- never touch this table directly — verification/acceptance go through
-- the SECURITY DEFINER RPCs below. (select auth.uid()) is the initplan
-- form (matches live; avoids per-row re-evaluation).
drop policy if exists invitations_trainer_all on public.invitations;

create policy invitations_trainer_all
  on public.invitations
  for all
  using  (trainer_id = (select auth.uid()))
  with check (trainer_id = (select auth.uid()));

-- ------------------------------------------------------------
-- 2b. accept_invitation / verify_invitation (SECURITY DEFINER).
--     `create or replace` => idempotent no-op on live.
-- ------------------------------------------------------------
create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.invitations%rowtype;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select * into v_inv from public.invitations where token = p_token for update;
  if not found then raise exception 'invitation not found' using errcode = 'P0002'; end if;
  if v_inv.status <> 'pending' or v_inv.expires_at <= now() then
    raise exception 'invitation is not valid' using errcode = 'P0001';
  end if;
  update public.invitations set status='accepted', accepted_at=now(), accepted_user=v_uid where id=v_inv.id;
  insert into public.trainer_clients (trainer_id, client_id, status)
  values (v_inv.trainer_id, v_uid, 'active')
  on conflict (trainer_id, client_id) do update set status='active';
  return v_inv.trainer_id;
end; $$;

create or replace function public.verify_invitation(p_token text)
returns table(email text, trainer_name text, valid boolean)
language sql
security definer
set search_path to 'public'
as $$
  select i.email, u.full_name as trainer_name,
         (i.status = 'pending' and i.expires_at > now()) as valid
  from public.invitations i
  join public.users u on u.id = i.trainer_id
  where i.token = p_token;
$$;

-- ------------------------------------------------------------
-- 2c. BUG-019 advisor revoke (live-only drift the merged 00012
--     omitted). tc_guard_activate() is a trigger function; it must
--     never be callable directly by PostgREST roles. REVOKE is
--     idempotent (no error if already revoked). The function body
--     already matches merged 00012 as of 2026-07-22 — no redefinition.
-- ------------------------------------------------------------
revoke execute on function public.tc_guard_activate() from anon, authenticated, public;
