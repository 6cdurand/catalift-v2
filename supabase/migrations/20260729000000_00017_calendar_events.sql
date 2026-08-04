-- ============================================================
-- Migration 00017: calendar_events (table + RLS + undo RPC)
--
-- The booking/scheduling spine. Ported from v1, where the
-- authoritative shape is what the v1 app WRITES
-- (`supabaseSync.syncCalendarEventToSupabase`), NOT v1's stale
-- `supabase/schema.sql` (INC-003 failure mode: trusting a stale
-- schema artefact).
--
-- Two v1 mistakes FIXED here, not copied:
--   1. v1 `client_id TEXT` -> v2 `uuid` with a real validated FK.
--   2. v1 shipped the base table with no RLS and bolted it on
--      later -> v2 ships RLS in the same migration.
--
-- `id` is `text` DELIBERATELY: it must join to the already-shipped
-- `public.client_sessions.calendar_event_id text` column that the
-- mark-complete dedupe writes (00016). Altering a live column that
-- feeds session counts — which feed money — is not worth the
-- tidiness. UUID-shaped strings are generated client-side, as v1 does.
--
-- `owner_user_id` + `event_scope` are load-bearing, not optional:
-- `src/lib/calendarScope.ts#getVisibleCalendarEvents` uses them to
-- keep a trainer's personal events off client calendars and other
-- clients' assigned workouts off the trainer's own calendar.
--
-- No data backfill — the table starts empty.
-- No trigger anywhere writes `trainer_clients.historical_offset_sessions`
-- (INC-002: that column stays the single writable count authority).
--
-- ROLLBACK:
--   drop function if exists public.uncomplete_calendar_event(text);
--   drop trigger if exists calendar_events_guard_client_update on public.calendar_events;
--   drop function if exists public.ce_guard_client_update();
--   drop trigger if exists calendar_events_set_updated_at on public.calendar_events;
--   drop table if exists public.calendar_events cascade;
-- ============================================================

-- ------------------------------------------------------------
-- 1. Table
-- ------------------------------------------------------------
create table if not exists public.calendar_events (
  id                  text primary key,
  title               text not null,
  type                text not null default 'session'
                        check (type in ('workout','session','consultation','assessment','rest')),
  date                date not null,
  start_time          time,
  end_time            time,
  duration            integer,
  trainer_id          uuid references public.users(id) on delete cascade,
  client_id           uuid references public.users(id) on delete cascade,
  workout_id          uuid,
  program_id          uuid,
  program_day_index   integer,
  status              text not null default 'scheduled'
                        check (status in ('scheduled','completed','cancelled')),
  location            text,
  notes               text,
  color               text,
  client_confirmed    boolean not null default false,
  client_confirmed_at timestamptz,
  recurrence_group    text,
  contact_name        text,
  owner_user_id       uuid,
  event_scope         text not null default 'shared_session'
                        check (event_scope in ('trainer_personal','client_assigned','shared_session')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- updated_at maintenance (v2 convention, `set_updated_at` from 00001/00005).
-- CREATE TRIGGER has no IF NOT EXISTS; drop-then-create is idempotent.
drop trigger if exists calendar_events_set_updated_at on public.calendar_events;
create trigger calendar_events_set_updated_at
  before update on public.calendar_events
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 2. Indexes (mirroring v1 20250331_calendar_event_scoping.sql,
--    plus a client_id index because the client read policy and the
--    client calendar query both filter on it)
-- ------------------------------------------------------------
create index if not exists idx_calendar_events_trainer on public.calendar_events(trainer_id);
create index if not exists idx_calendar_events_client  on public.calendar_events(client_id);
create index if not exists idx_calendar_events_owner   on public.calendar_events(owner_user_id, event_scope);
create index if not exists idx_calendar_events_program on public.calendar_events(program_id);
create index if not exists idx_calendar_events_date    on public.calendar_events(date);

-- ------------------------------------------------------------
-- 3. RLS
--
--   calendar_events_trainer_all    — the owning trainer has full CRUD.
--   calendar_events_client_read    — a client may read ONLY rows addressed
--                                    to them AND only while the link is
--                                    ACTIVE (are_connected, hardened in
--                                    00012/BUG-019 to check status).
--   calendar_events_client_confirm — a client may UPDATE only their own
--                                    rows, and the guard trigger below
--                                    restricts the change to
--                                    client_confirmed/client_confirmed_at.
--
--   anon: no policy, and table privileges revoked below. Zero access.
-- ------------------------------------------------------------
alter table public.calendar_events enable row level security;

drop policy if exists calendar_events_trainer_all on public.calendar_events;
create policy calendar_events_trainer_all
  on public.calendar_events for all
  to authenticated
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

drop policy if exists calendar_events_client_read on public.calendar_events;
create policy calendar_events_client_read
  on public.calendar_events for select
  to authenticated
  using (
    client_id = auth.uid()
    and public.are_connected(trainer_id, auth.uid())
  );

drop policy if exists calendar_events_client_confirm on public.calendar_events;
create policy calendar_events_client_confirm
  on public.calendar_events for update
  to authenticated
  using (
    client_id = auth.uid()
    and public.are_connected(trainer_id, auth.uid())
  )
  with check (
    client_id = auth.uid()
    and public.are_connected(trainer_id, auth.uid())
  );

-- Defence in depth: anon must never reach this table even if a future
-- policy is written carelessly. REVOKE is idempotent.
revoke all on table public.calendar_events from anon;
grant select, insert, update, delete on table public.calendar_events to authenticated;

-- ------------------------------------------------------------
-- 4. Client-confirm guard
--
-- A WITH CHECK cannot compare OLD vs NEW, so the "client may change
-- ONLY the confirmation fields" half of the policy is enforced here.
-- Without it, a client holding the UPDATE policy could move a
-- session's date, flip its status to 'completed', or rewrite notes.
--
-- Applies only when the caller is the row's client and is NOT the
-- row's trainer (a trainer editing their own row is unaffected; the
-- self-coaching trainer==client case is treated as the trainer).
--
-- It also STAMPS client_confirmed_at server-side: a confirmation time
-- is evidence, so it comes from the DB clock, never the client's device.
-- ------------------------------------------------------------
create or replace function public.ce_guard_client_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or auth.uid() is distinct from old.client_id
     or auth.uid() = old.trainer_id then
    return new;
  end if;

  if new.id                is distinct from old.id
     or new.title             is distinct from old.title
     or new.type              is distinct from old.type
     or new.date              is distinct from old.date
     or new.start_time        is distinct from old.start_time
     or new.end_time          is distinct from old.end_time
     or new.duration          is distinct from old.duration
     or new.trainer_id        is distinct from old.trainer_id
     or new.client_id         is distinct from old.client_id
     or new.workout_id        is distinct from old.workout_id
     or new.program_id        is distinct from old.program_id
     or new.program_day_index is distinct from old.program_day_index
     or new.status            is distinct from old.status
     or new.location          is distinct from old.location
     or new.notes             is distinct from old.notes
     or new.color             is distinct from old.color
     or new.recurrence_group  is distinct from old.recurrence_group
     or new.contact_name      is distinct from old.contact_name
     or new.owner_user_id     is distinct from old.owner_user_id
     or new.event_scope       is distinct from old.event_scope
     or new.created_at        is distinct from old.created_at then
    raise exception 'a client may only change client_confirmed / client_confirmed_at on a calendar event'
      using errcode = 'check_violation';
  end if;

  -- Server-side timestamp: the client cannot backdate or forge a confirmation.
  if new.client_confirmed and not old.client_confirmed then
    new.client_confirmed_at := now();
  elsif not new.client_confirmed then
    new.client_confirmed_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists calendar_events_guard_client_update on public.calendar_events;
create trigger calendar_events_guard_client_update
  before update on public.calendar_events
  for each row execute function public.ce_guard_client_update();

-- Trigger functions must never be callable directly by PostgREST roles.
revoke execute on function public.ce_guard_client_update() from anon, authenticated, public;

-- ------------------------------------------------------------
-- 5. uncomplete_calendar_event(text) — undo mark-complete
--
-- Reversing "mark complete" MUST also delete the client_sessions row
-- that mark-complete created, matched on calendar_event_id. If it
-- doesn't, completed-session counts inflate, and those counts drive
-- outstanding payments — a silent money bug.
--
-- Done as ONE security-definer transaction, not two client-side
-- writes: a partial failure there desynchronises money. Scoped to the
-- calling TRAINER only (`trainer_id = auth.uid()` on both statements),
-- so security definer grants no cross-trainer reach.
--
-- Does NOT touch trainer_clients.historical_offset_sessions (INC-002).
-- ------------------------------------------------------------
create or replace function public.uncomplete_calendar_event(p_event_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_found boolean;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select true into v_found
  from public.calendar_events
  where id = p_event_id and trainer_id = v_uid
  for update;

  if not found then
    raise exception 'calendar event % not found for this trainer', p_event_id
      using errcode = 'P0002';
  end if;

  update public.calendar_events
  set status = 'scheduled'
  where id = p_event_id and trainer_id = v_uid;

  delete from public.client_sessions
  where calendar_event_id = p_event_id and trainer_id = v_uid;
end;
$$;

revoke execute on function public.uncomplete_calendar_event(text) from anon, public;
grant execute on function public.uncomplete_calendar_event(text) to authenticated;
