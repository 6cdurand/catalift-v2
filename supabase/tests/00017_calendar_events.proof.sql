-- ============================================================
-- Behavioural proof for migration 00017 (calendar_events).
-- Run AFTER 00017 is applied, against a Supabase dev branch (or the
-- SQL editor). Wrapped in a transaction that ROLLS BACK, so it seeds
-- + cleans up and leaves no rows behind.
--
-- Each assertion RAISES on failure; a clean run prints the NOTICE
-- lines and ends with "00017 PROOF PASSED".
--
-- Simulates authenticated users by switching to the `authenticated`
-- role and setting request.jwt.claims.sub (which is what auth.uid()
-- reads). Seeding runs as the privileged session role; RLS is only
-- enforced once we `set local role authenticated`.
-- ============================================================
begin;

-- --- seed: trainer A, client B (active link), client C (no link) ---
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000017', 'trainer-a@proof17.test'),
  ('bbbbbbbb-0000-0000-0000-000000000017', 'client-b@proof17.test'),
  ('cccccccc-0000-0000-0000-000000000017', 'client-c@proof17.test')
on conflict (id) do nothing;

insert into public.users (id, email, role) values
  ('aaaaaaaa-0000-0000-0000-000000000017', 'trainer-a@proof17.test', 'trainer'),
  ('bbbbbbbb-0000-0000-0000-000000000017', 'client-b@proof17.test', 'client'),
  ('cccccccc-0000-0000-0000-000000000017', 'client-c@proof17.test', 'client')
on conflict (id) do nothing;

insert into public.trainer_clients (trainer_id, client_id, status) values
  ('aaaaaaaa-0000-0000-0000-000000000017', 'bbbbbbbb-0000-0000-0000-000000000017', 'active')
on conflict (trainer_id, client_id) do update set status = 'active';

-- shared session A<->B, and a trainer-personal event owned by A
insert into public.calendar_events
  (id, title, type, date, trainer_id, client_id, owner_user_id, event_scope)
values
  ('proof17-shared', 'PT Session', 'session', current_date,
   'aaaaaaaa-0000-0000-0000-000000000017', 'bbbbbbbb-0000-0000-0000-000000000017',
   'bbbbbbbb-0000-0000-0000-000000000017', 'shared_session'),
  ('proof17-private', 'Dentist', 'session', current_date,
   'aaaaaaaa-0000-0000-0000-000000000017', null,
   'aaaaaaaa-0000-0000-0000-000000000017', 'trainer_personal');

-- ------------------------------------------------------------
-- 1. RLS is on and there is no anon access.
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_class
    where oid = 'public.calendar_events'::regclass and relrowsecurity
  ) then
    raise exception 'FAIL: RLS is not enabled on calendar_events';
  end if;

  if has_table_privilege('anon', 'public.calendar_events', 'select') then
    raise exception 'FAIL: anon can select calendar_events';
  end if;
  raise notice 'PASS 1: RLS enabled, anon has no table privilege';
end $$;

-- ------------------------------------------------------------
-- 2. Client B sees only the event addressed to them.
-- ------------------------------------------------------------
do $$
declare v_ids text[];
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"bbbbbbbb-0000-0000-0000-000000000017"}';

  select array_agg(id order by id) into v_ids from public.calendar_events;
  if v_ids is distinct from array['proof17-shared'] then
    raise exception 'FAIL: client B sees %, expected only proof17-shared', v_ids;
  end if;
  raise notice 'PASS 2: client cannot read the trainer-personal event';
end $$;
reset role;

-- ------------------------------------------------------------
-- 3. Client C (no link) sees nothing.
-- ------------------------------------------------------------
do $$
declare v_count integer;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"cccccccc-0000-0000-0000-000000000017"}';

  select count(*) into v_count from public.calendar_events;
  if v_count <> 0 then
    raise exception 'FAIL: unconnected client C sees % rows', v_count;
  end if;
  raise notice 'PASS 3: unconnected client sees nothing';
end $$;
reset role;

-- ------------------------------------------------------------
-- 4. A PENDING link leaks nothing (are_connected is status-aware).
-- ------------------------------------------------------------
update public.trainer_clients set status = 'pending'
where trainer_id = 'aaaaaaaa-0000-0000-0000-000000000017'
  and client_id  = 'bbbbbbbb-0000-0000-0000-000000000017';

do $$
declare v_count integer;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"bbbbbbbb-0000-0000-0000-000000000017"}';

  select count(*) into v_count from public.calendar_events;
  if v_count <> 0 then
    raise exception 'FAIL: a pending link still exposes % rows', v_count;
  end if;
  raise notice 'PASS 4: pending link leaks nothing';
end $$;
reset role;

update public.trainer_clients set status = 'active'
where trainer_id = 'aaaaaaaa-0000-0000-0000-000000000017'
  and client_id  = 'bbbbbbbb-0000-0000-0000-000000000017';

-- ------------------------------------------------------------
-- 5. The client may confirm (timestamp stamped server-side), and may
--    change NOTHING else.
-- ------------------------------------------------------------
do $$
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"bbbbbbbb-0000-0000-0000-000000000017"}';

  update public.calendar_events
  set client_confirmed = true
  where id = 'proof17-shared';

  if not exists (
    select 1 from public.calendar_events
    where id = 'proof17-shared' and client_confirmed
  ) then
    raise exception 'FAIL: client could not confirm their own session';
  end if;

  if not exists (
    select 1 from public.calendar_events
    where id = 'proof17-shared' and client_confirmed_at is not null
  ) then
    raise exception 'FAIL: client_confirmed_at was not stamped server-side';
  end if;
  raise notice 'PASS 5a: client can confirm; timestamp stamped by the DB clock';
end $$;
reset role;

do $$
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"bbbbbbbb-0000-0000-0000-000000000017"}';

  begin
    update public.calendar_events set date = current_date + 7
    where id = 'proof17-shared';
    raise exception 'FAIL: client moved the session date';
  exception when check_violation then
    raise notice 'PASS 5b: client cannot move the date';
  end;

  begin
    update public.calendar_events set status = 'completed'
    where id = 'proof17-shared';
    raise exception 'FAIL: client marked the session completed';
  exception when check_violation then
    raise notice 'PASS 5c: client cannot change status';
  end;

  begin
    update public.calendar_events set notes = 'tampered'
    where id = 'proof17-shared';
    raise exception 'FAIL: client rewrote the notes';
  exception when check_violation then
    raise notice 'PASS 5d: client cannot rewrite notes';
  end;
end $$;
reset role;

-- ------------------------------------------------------------
-- 6. The client cannot insert or delete.
-- ------------------------------------------------------------
do $$
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"bbbbbbbb-0000-0000-0000-000000000017"}';

  begin
    insert into public.calendar_events (id, title, type, date, client_id)
    values ('proof17-forged', 'Forged', 'session', current_date,
            'bbbbbbbb-0000-0000-0000-000000000017');
    raise exception 'FAIL: client inserted a calendar event';
  exception when insufficient_privilege then
    raise notice 'PASS 6a: client cannot insert';
  end;

  delete from public.calendar_events where id = 'proof17-shared';
  if not exists (select 1 from public.calendar_events where id = 'proof17-shared') then
    raise exception 'FAIL: client deleted the session';
  end if;
  raise notice 'PASS 6b: client delete is a no-op';
end $$;
reset role;

-- ------------------------------------------------------------
-- 7. Undo deletes the client_sessions row (money).
-- ------------------------------------------------------------
update public.calendar_events set status = 'completed' where id = 'proof17-shared';
insert into public.client_sessions
  (trainer_id, client_id, source, calendar_event_id)
values
  ('aaaaaaaa-0000-0000-0000-000000000017', 'bbbbbbbb-0000-0000-0000-000000000017',
   'pt_completion', 'proof17-shared');

do $$
declare v_count integer; v_status text;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000017"}';

  perform public.uncomplete_calendar_event('proof17-shared');

  select status into v_status from public.calendar_events where id = 'proof17-shared';
  if v_status <> 'scheduled' then
    raise exception 'FAIL: event status is % after undo', v_status;
  end if;

  select count(*) into v_count from public.client_sessions
  where calendar_event_id = 'proof17-shared';
  if v_count <> 0 then
    raise exception 'FAIL: undo left % client_sessions row(s) — counts inflate', v_count;
  end if;
  raise notice 'PASS 7: undo reverts status AND deletes the session row';
end $$;
reset role;

-- ------------------------------------------------------------
-- 8. Undo is trainer-scoped: another trainer cannot undo A's event.
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('dddddddd-0000-0000-0000-000000000017', 'trainer-d@proof17.test')
on conflict (id) do nothing;
insert into public.users (id, email, role) values
  ('dddddddd-0000-0000-0000-000000000017', 'trainer-d@proof17.test', 'trainer')
on conflict (id) do nothing;

do $$
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"dddddddd-0000-0000-0000-000000000017"}';

  begin
    perform public.uncomplete_calendar_event('proof17-shared');
    raise exception 'FAIL: a foreign trainer ran undo on someone else''s event';
  exception when no_data_found or sqlstate 'P0002' then
    raise notice 'PASS 8: undo is scoped to the owning trainer';
  end;
end $$;
reset role;

-- ------------------------------------------------------------
-- 8b. Booking modes: template slug alone is fine; program + template
--     together is rejected (calendar_events_single_source_ck).
-- ------------------------------------------------------------
do $$
begin
  insert into public.calendar_events
    (id, title, type, date, trainer_id, client_id, template_slug)
  values
    ('proof17-template', 'Upper 3-day', 'workout', current_date,
     'aaaaaaaa-0000-0000-0000-000000000017', 'bbbbbbbb-0000-0000-0000-000000000017',
     'upper-3day');
  raise notice 'PASS 8b-i: a trainer-template slug stores without touching workout_id';

  begin
    insert into public.calendar_events
      (id, title, type, date, trainer_id, program_id, program_day_index, template_slug)
    values
      ('proof17-both', 'Confused', 'workout', current_date,
       'aaaaaaaa-0000-0000-0000-000000000017',
       '99999999-9999-9999-9999-999999999999', 0, 'upper-3day');
    raise exception 'FAIL: a row claimed both a program and a template';
  exception when check_violation then
    raise notice 'PASS 8b-ii: program_id + template_slug together is rejected';
  end;
end $$;

-- ------------------------------------------------------------
-- 9. historical_offset_sessions is untouched (INC-002).
-- ------------------------------------------------------------
do $$
declare v_offset integer;
begin
  select historical_offset_sessions into v_offset
  from public.trainer_clients
  where trainer_id = 'aaaaaaaa-0000-0000-0000-000000000017'
    and client_id  = 'bbbbbbbb-0000-0000-0000-000000000017';
  if v_offset <> 0 then
    raise exception 'FAIL: something wrote historical_offset_sessions (now %)', v_offset;
  end if;
  raise notice 'PASS 9: historical_offset_sessions untouched';
  raise notice '00017 PROOF PASSED';
end $$;

rollback;
