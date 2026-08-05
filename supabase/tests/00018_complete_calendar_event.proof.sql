-- ============================================================
-- Behavioural proof for migration 00018 (complete_calendar_event).
-- Run AFTER 00018 is applied, against a Supabase dev branch (or the
-- SQL editor). Wrapped in a transaction that ROLLS BACK, so it seeds
-- + cleans up and leaves no rows behind.
--
-- Each assertion RAISES on failure and also appends a row to the
-- temp table `proof18_log`, which is selected out at the end so the
-- run produces readable output even through an API/SQL-editor client
-- that swallows NOTICE lines. A clean run prints the PASS rows and
-- ends with "00018 PROOF PASSED".
--
-- Simulates authenticated users by switching to the `authenticated`
-- role and setting request.jwt.claims.sub (which is what auth.uid()
-- reads). Seeding runs as the privileged session role; RLS is only
-- enforced once we `set local role authenticated`.
--
-- Same shape as 00017's proof (supabase/tests/00017_calendar_events.proof.sql).
-- ============================================================
begin;

create temp table proof18_log (step text, result text) on commit drop;
-- the assertion blocks run as `authenticated`, so they need write access
-- to the log table (temp tables are owned by the session role).
grant select, insert on proof18_log to authenticated;

-- --- seed: trainer A, client B (active link), trainer D (foreign) ---
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000018', 'trainer-a@proof18.test'),
  ('bbbbbbbb-0000-0000-0000-000000000018', 'client-b@proof18.test'),
  ('dddddddd-0000-0000-0000-000000000018', 'trainer-d@proof18.test')
on conflict (id) do nothing;

insert into public.users (id, email, role) values
  ('aaaaaaaa-0000-0000-0000-000000000018', 'trainer-a@proof18.test', 'trainer'),
  ('bbbbbbbb-0000-0000-0000-000000000018', 'client-b@proof18.test', 'client'),
  ('dddddddd-0000-0000-0000-000000000018', 'trainer-d@proof18.test', 'trainer')
on conflict (id) do nothing;

insert into public.trainer_clients (trainer_id, client_id, status) values
  ('aaaaaaaa-0000-0000-0000-000000000018', 'bbbbbbbb-0000-0000-0000-000000000018', 'active')
on conflict (trainer_id, client_id) do update set status = 'active';

-- A BACK-DATED booked session: date < today is the exact branch that
-- `deriveBookingStatus` renders as "missed" while status stays
-- 'scheduled'. Proving on today's date would prove nothing.
insert into public.calendar_events
  (id, title, type, date, trainer_id, client_id, owner_user_id, event_scope)
values
  ('proof18-booked', 'PT Session', 'session', current_date - 3,
   'aaaaaaaa-0000-0000-0000-000000000018', 'bbbbbbbb-0000-0000-0000-000000000018',
   'bbbbbbbb-0000-0000-0000-000000000018', 'shared_session'),
  ('proof18-private', 'Dentist', 'session', current_date - 3,
   'aaaaaaaa-0000-0000-0000-000000000018', null,
   'aaaaaaaa-0000-0000-0000-000000000018', 'trainer_personal');

-- ------------------------------------------------------------
-- 0. Grants: anon/public cannot execute; authenticated can.
-- ------------------------------------------------------------
do $$
begin
  if has_function_privilege('anon', 'public.complete_calendar_event(text)', 'execute') then
    raise exception 'FAIL: anon can execute complete_calendar_event';
  end if;
  if not has_function_privilege('authenticated', 'public.complete_calendar_event(text)', 'execute') then
    raise exception 'FAIL: authenticated cannot execute complete_calendar_event';
  end if;
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'complete_calendar_event'
      and p.prosecdef
      and p.proconfig @> array['search_path=public']
  ) then
    raise exception 'FAIL: not security definer with a pinned search_path';
  end if;
  insert into proof18_log values
    ('PASS 0', 'security definer + pinned search_path; anon revoked, authenticated granted');
  raise notice 'PASS 0: grants + security definer + pinned search_path';
end $$;

-- ------------------------------------------------------------
-- 1. Complete: status -> 'completed' AND exactly ONE client_sessions
--    row, source = 'booking', session_date from the event row.
-- ------------------------------------------------------------
do $$
declare
  v_status text;
  v_count  integer;
  v_source text;
  v_date   date;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000018"}';

  perform public.complete_calendar_event('proof18-booked');

  select status into v_status from public.calendar_events where id = 'proof18-booked';
  if v_status <> 'completed' then
    raise exception 'FAIL: event status is % after complete', v_status;
  end if;

  select count(*) into v_count from public.client_sessions
  where calendar_event_id = 'proof18-booked';
  if v_count <> 1 then
    raise exception 'FAIL: complete wrote % client_sessions row(s), expected 1', v_count;
  end if;

  select source, session_date into v_source, v_date from public.client_sessions
  where calendar_event_id = 'proof18-booked';
  if v_source <> 'booking' then
    raise exception 'FAIL: ledger row source is %, expected booking', v_source;
  end if;
  if v_date <> current_date - 3 then
    raise exception 'FAIL: session_date is %, expected the event date %', v_date, current_date - 3;
  end if;

  insert into proof18_log values
    ('PASS 1', format('status=%s, 1 client_sessions row, source=%s, session_date=%s (the event date)',
                      v_status, v_source, v_date));
  raise notice 'PASS 1: status completed + exactly one booking ledger row';
end $$;
reset role;

-- ------------------------------------------------------------
-- 2. THE MONEY CASE. Calling it twice -> still exactly ONE row.
-- ------------------------------------------------------------
do $$
declare v_count integer; v_status text;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000018"}';

  perform public.complete_calendar_event('proof18-booked');
  perform public.complete_calendar_event('proof18-booked');

  select count(*) into v_count from public.client_sessions
  where calendar_event_id = 'proof18-booked';
  if v_count <> 1 then
    raise exception 'FAIL: repeat calls produced % billable rows — money bug', v_count;
  end if;

  select status into v_status from public.calendar_events where id = 'proof18-booked';
  if v_status <> 'completed' then
    raise exception 'FAIL: repeat call left status %', v_status;
  end if;

  insert into proof18_log values
    ('PASS 2', format('3 calls total -> %s client_sessions row (no second billable session)', v_count));
  raise notice 'PASS 2: repeat calls collapse to ONE ledger row';
end $$;
reset role;

-- ------------------------------------------------------------
-- 3. Full round-trip: complete -> uncomplete leaves the DB exactly
--    as it started (status 'scheduled', zero ledger rows).
-- ------------------------------------------------------------
do $$
declare v_status text; v_count integer; v_before integer; v_after integer;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000018"}';

  select count(*) into v_before from public.client_sessions;

  perform public.uncomplete_calendar_event('proof18-booked');

  select status into v_status from public.calendar_events where id = 'proof18-booked';
  if v_status <> 'scheduled' then
    raise exception 'FAIL: status is % after the round-trip, expected scheduled', v_status;
  end if;

  select count(*) into v_count from public.client_sessions
  where calendar_event_id = 'proof18-booked';
  if v_count <> 0 then
    raise exception 'FAIL: round-trip left % ledger row(s)', v_count;
  end if;

  select count(*) into v_after from public.client_sessions;
  if v_after <> v_before - 1 then
    raise exception 'FAIL: client_sessions went % -> %, expected exactly one row removed',
      v_before, v_after;
  end if;

  -- and it is repeatable: complete again from the clean state.
  perform public.complete_calendar_event('proof18-booked');
  select count(*) into v_count from public.client_sessions
  where calendar_event_id = 'proof18-booked';
  if v_count <> 1 then
    raise exception 'FAIL: re-complete after undo wrote % rows', v_count;
  end if;
  perform public.uncomplete_calendar_event('proof18-booked');

  insert into proof18_log values
    ('PASS 3', 'complete -> uncomplete -> scheduled + 0 ledger rows; repeatable both ways');
  raise notice 'PASS 3: full round-trip is exact';
end $$;
reset role;

-- ------------------------------------------------------------
-- 4. A trainer cannot complete another trainer's event (P0002).
-- ------------------------------------------------------------
do $$
declare v_count integer;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"dddddddd-0000-0000-0000-000000000018"}';

  begin
    perform public.complete_calendar_event('proof18-booked');
    raise exception 'FAIL: a foreign trainer completed someone else''s event';
  exception when no_data_found or sqlstate 'P0002' then
    insert into proof18_log values ('PASS 4', 'foreign trainer -> P0002, no ledger row');
    raise notice 'PASS 4: complete is scoped to the owning trainer';
  end;

  select count(*) into v_count from public.client_sessions
  where calendar_event_id = 'proof18-booked';
  if v_count <> 0 then
    raise exception 'FAIL: the foreign call still wrote % ledger row(s)', v_count;
  end if;
end $$;
reset role;

-- ------------------------------------------------------------
-- 5. Unauthenticated -> 28000.
-- ------------------------------------------------------------
do $$
begin
  set local role authenticated;
  set local request.jwt.claims = '{}';

  begin
    perform public.complete_calendar_event('proof18-booked');
    raise exception 'FAIL: an unauthenticated caller completed an event';
  exception when sqlstate '28000' then
    insert into proof18_log values ('PASS 5', 'no auth.uid() -> 28000');
    raise notice 'PASS 5: unauthenticated is rejected with 28000';
  end;
end $$;
reset role;

-- ------------------------------------------------------------
-- 6. Backstops: a client-less (trainer-personal) event and a
--    cancelled event never become billable rows.
-- ------------------------------------------------------------
do $$
declare v_count integer;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000018"}';

  begin
    perform public.complete_calendar_event('proof18-private');
    raise exception 'FAIL: a client-less event produced a session';
  exception when sqlstate '22023' then
    raise notice 'PASS 6a: trainer-personal event is rejected (22023)';
  end;

  select count(*) into v_count from public.client_sessions;
  if v_count <> 0 then
    raise exception 'FAIL: % ledger row(s) exist after the rejected calls', v_count;
  end if;
  insert into proof18_log values
    ('PASS 6', 'client-less event -> 22023, cancelled event -> 22023, zero ledger rows');
end $$;
reset role;

update public.calendar_events set status = 'cancelled' where id = 'proof18-booked';

do $$
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000018"}';

  begin
    perform public.complete_calendar_event('proof18-booked');
    raise exception 'FAIL: a cancelled session was marked complete and billed';
  exception when sqlstate '22023' then
    raise notice 'PASS 6b: a cancelled session cannot be completed (22023)';
  end;
end $$;
reset role;

update public.calendar_events set status = 'scheduled' where id = 'proof18-booked';

-- ------------------------------------------------------------
-- 7. historical_offset_sessions is untouched (INC-002).
-- ------------------------------------------------------------
do $$
declare v_offset integer;
begin
  select historical_offset_sessions into v_offset
  from public.trainer_clients
  where trainer_id = 'aaaaaaaa-0000-0000-0000-000000000018'
    and client_id  = 'bbbbbbbb-0000-0000-0000-000000000018';
  if v_offset <> 0 then
    raise exception 'FAIL: something wrote historical_offset_sessions (now %)', v_offset;
  end if;
  insert into proof18_log values ('PASS 7', 'trainer_clients.historical_offset_sessions still 0');
  insert into proof18_log values ('RESULT', '00018 PROOF PASSED');
  raise notice 'PASS 7: historical_offset_sessions untouched';
  raise notice '00018 PROOF PASSED';
end $$;

select step, result from proof18_log order by step;

rollback;
