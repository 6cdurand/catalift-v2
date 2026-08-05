-- ============================================================
-- Migration 00018: complete_calendar_event(text) — the forward half
-- of mark-complete for a BOOKED session.
--
-- 00017 shipped only the reverse RPC, `uncomplete_calendar_event`.
-- Nothing has ever set `calendar_events.status = 'completed'`:
-- `markSessionComplete` (features/payments/api/sessions.ts) inserts a
-- `client_sessions` row and never touches the event. So the status
-- column stays 'scheduled' forever, and `deriveBookingStatus`
-- (features/calendar/lib/mergeCalendarEvents.ts) — which reads only
-- that column — renders every past booking as "missed", including the
-- ones the trainer completed.
--
-- The reasoning in 00017's `uncomplete_calendar_event` header applies
-- identically in this direction, so this is its mirror:
--
--   "Done as ONE security-definer transaction, not two client-side
--    writes: a partial failure there desynchronises money."
--
-- Today mark-complete IS two client-side writes — except the second
-- one (the status update) was never built. One transaction: flip the
-- status AND write the ledger row, or neither.
--
-- IDEMPOTENT BY CONSTRUCTION. The insert rides the partial unique
-- index `client_sessions_dedupe_event (client_id, calendar_event_id)
-- where calendar_event_id is not null` (00016:39-41) with
-- `on conflict ... do nothing`, so a double-tap or a second device
-- collapses to ONE ledger row. A second call must never create a
-- second BILLABLE session — completed-session counts drive outstanding
-- payments.
--
-- `source = 'booking'`, the value 00016:29-30 reserved for exactly
-- this and nothing has used yet. Program-derived completions keep
-- passing 'pt_completion' through `markSessionComplete`; that path is
-- untouched.
--
-- Does NOT touch `trainer_clients.historical_offset_sessions`
-- (INC-002: that column stays the single writable count authority).
--
-- ROLLBACK:
--   drop function if exists public.complete_calendar_event(text);
-- ============================================================

-- ------------------------------------------------------------
-- complete_calendar_event(text) — mark a booked session complete
--
-- Structure is `uncomplete_calendar_event` (00017:241-274) line for
-- line: plpgsql / security definer / pinned search_path, `v_uid` from
-- auth.uid() with a 28000 raise, a `select ... for update` scoped
-- `trainer_id = v_uid` with a P0002 raise, then the status write and
-- the `client_sessions` write in that one transaction. Scoped to the
-- calling TRAINER on every statement, so security definer grants no
-- cross-trainer reach.
--
-- The one place it deliberately does NOT mirror the reverse: it takes
-- NO caller-supplied columns. `client_id` and `session_date` are read
-- off the locked event row, not accepted as arguments. A caller who
-- could pass a `client_id` that differs from the event's own would
-- bill the wrong client, and — because the dedupe index is
-- (client_id, calendar_event_id) — two different client_ids for the
-- SAME event would both insert, defeating the idempotency this
-- function exists to guarantee.
--
-- `workout_id` is left null on purpose. `calendar_events.workout_id`
-- is a PLANNED workout and carries no FK; `client_sessions.workout_id`
-- references `public.workouts(id)` and has its own unique index.
-- Copying one into the other would either raise 23503 or silently
-- collide on `client_sessions_dedupe_workout` — and a swallowed
-- collision there would leave the event 'completed' with no row that
-- `uncomplete_calendar_event` (which matches on `calendar_event_id`)
-- could ever delete, breaking the round-trip. Null keeps exactly one
-- unique index in play.
-- ------------------------------------------------------------
create or replace function public.complete_calendar_event(p_event_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_client_id uuid;
  v_date      date;
  v_status    text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select client_id, date, status
    into v_client_id, v_date, v_status
  from public.calendar_events
  where id = p_event_id and trainer_id = v_uid
  for update;

  if not found then
    raise exception 'calendar event % not found for this trainer', p_event_id
      using errcode = 'P0002';
  end if;

  -- A cancelled session did not happen, so it must never become a
  -- billable ledger row. Unreachable from the UI (mergeCalendarEvents
  -- drops cancelled rows) — this is the money backstop.
  if v_status = 'cancelled' then
    raise exception 'calendar event % is cancelled and cannot be completed', p_event_id
      using errcode = '22023';
  end if;

  -- A trainer-personal event (event_scope 'trainer_personal') has no
  -- client and therefore no session to bill. Fail loudly rather than
  -- flip the status with no ledger row behind it.
  if v_client_id is null then
    raise exception 'calendar event % has no client to record a session for', p_event_id
      using errcode = '22023';
  end if;

  update public.calendar_events
  set status = 'completed'
  where id = p_event_id and trainer_id = v_uid;

  insert into public.client_sessions
    (trainer_id, client_id, source, calendar_event_id, session_date)
  values
    (v_uid, v_client_id, 'booking', p_event_id, v_date)
  on conflict (client_id, calendar_event_id) where calendar_event_id is not null
  do nothing;
end;
$$;

revoke execute on function public.complete_calendar_event(text) from anon, public;
grant execute on function public.complete_calendar_event(text) to authenticated;
