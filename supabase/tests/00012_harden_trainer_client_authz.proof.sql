-- ============================================================
-- BUG-019 behavioral proof for migration 00012.
-- Run AFTER 00012 is applied, against a Supabase dev branch (or
-- the SQL editor). Wrapped in a transaction that ROLLS BACK, so
-- it seeds + cleans up and leaves no rows behind.
--
-- Each assertion RAISES on failure; a clean run prints the
-- NOTICE lines and ends with "BUG-019 PROOF PASSED".
--
-- Simulates two authenticated users by switching to the
-- `authenticated` role and setting request.jwt.claims.sub
-- (which is what auth.uid() reads). Seeding runs as the
-- privileged session role; RLS is only enforced once we
-- `set local role authenticated`.
-- ============================================================
begin;

-- --- seed: trainer A, client/victim B ----------------------
insert into auth.users (id, email)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'trainer-a@proof.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'client-b@proof.test')
on conflict (id) do nothing;

insert into public.users (id, email, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'trainer-a@proof.test', 'trainer'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'client-b@proof.test', 'client')
on conflict (id) do nothing;

-- B has a private personal_best that A must not reach unless connected+active.
insert into public.personal_bests (user_id, exercise_id, value)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bench', 100)
on conflict do nothing;

-- Helper to authenticate as a given uid for the RLS-enforced statements.
create or replace function pg_temp.login(_uid uuid) returns void
language plpgsql as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', _uid::text, 'role', 'authenticated')::text,
    true);
end;
$$;

do $$
declare
  a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  b uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  link_id uuid;
  leaked int;
  failed boolean;
begin
  -- ========================================================
  -- 1 + 2. Attacker A inserts a link naming victim B.
  --        RLS forces it to 'pending'; a 'pending' link leaks
  --        nothing (are_connected = false), so A cannot read B.
  -- ========================================================
  set local role authenticated;
  perform pg_temp.login(a);

  -- Attempt to self-activate on insert must fail (insert policy forces pending).
  failed := false;
  begin
    insert into public.trainer_clients (trainer_id, client_id, status)
    values (a, b, 'active');
  exception when others then
    failed := true;
  end;
  if not failed then
    raise exception 'FAIL 2: trainer was able to INSERT an active link';
  end if;

  -- The only insert a trainer can make is a pending one.
  insert into public.trainer_clients (trainer_id, client_id, status)
  values (a, b, 'pending')
  returning id into link_id;

  if public.are_connected(a, b) then
    raise exception 'FAIL 1/2: pending link reports as connected (leak)';
  end if;

  select count(*) into leaked from public.personal_bests where user_id = b;
  if leaked <> 0 then
    raise exception 'FAIL 1/2: attacker read % victim personal_bests via pending link', leaked;
  end if;
  raise notice 'PASS 1+2: pending link leaks nothing (are_connected=false, 0 rows read)';

  -- ========================================================
  -- 4. Trainer A cannot self-activate via UPDATE (old <> active).
  -- ========================================================
  failed := false;
  begin
    update public.trainer_clients set status = 'active' where id = link_id;
  exception when others then
    failed := true;
  end;
  if not failed then
    raise exception 'FAIL 4: trainer self-activated the link via UPDATE';
  end if;
  raise notice 'PASS 4: trainer cannot flip status to active (trigger blocked it)';

  -- ========================================================
  -- 3. Client B accepts (pending -> active). Trainer A can now
  --    read B's personal_bests.
  -- ========================================================
  perform pg_temp.login(b);
  update public.trainer_clients set status = 'active' where id = link_id;

  perform pg_temp.login(a);
  if not public.are_connected(a, b) then
    raise exception 'FAIL 3: active link not reported as connected';
  end if;
  select count(*) into leaked from public.personal_bests where user_id = b;
  if leaked = 0 then
    raise exception 'FAIL 3: trainer cannot read connected client rows after accept';
  end if;
  raise notice 'PASS 3: client accept activates link; trainer now reads client rows';

  -- ========================================================
  -- 5. On an already-active link, trainer edits the offset
  --    (status unchanged) -> succeeds.
  -- ========================================================
  update public.trainer_clients
    set historical_offset_sessions = 7
  where id = link_id;

  perform historical_offset_sessions from public.trainer_clients where id = link_id;
  if (select historical_offset_sessions from public.trainer_clients where id = link_id) <> 7 then
    raise exception 'FAIL 5: trainer offset edit did not persist';
  end if;
  raise notice 'PASS 5: trainer edits historical_offset_sessions on active link';

  -- ========================================================
  -- 6. Link identity is immutable. A party to a link cannot
  --    repoint it at a third user to gain a read connection.
  --    (Seed a fresh PENDING link A->B, then A attempts to
  --    repoint client_id at victim C, and B attempts to
  --    repoint trainer_id at victim C — both must be rejected,
  --    and A must still not read C.)
  -- ========================================================
  insert into auth.users (id, email)
  values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'victim-c@proof.test')
  on conflict (id) do nothing;
  insert into public.users (id, email, role)
  values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'victim-c@proof.test', 'client')
  on conflict (id) do nothing;
  insert into public.personal_bests (user_id, exercise_id, value)
  values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'squat', 200)
  on conflict do nothing;

  perform pg_temp.login(a);
  insert into public.trainer_clients (trainer_id, client_id, status)
  values (a, b, 'pending')
  returning id into link_id;

  -- Trainer A repoints client_id at victim C -> rejected.
  failed := false;
  begin
    update public.trainer_clients
      set client_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
    where id = link_id;
  exception when others then
    failed := true;
  end;
  if not failed then
    raise exception 'FAIL 6: trainer repointed client_id at a victim';
  end if;

  -- Client B repoints trainer_id at victim C -> rejected.
  perform pg_temp.login(b);
  failed := false;
  begin
    update public.trainer_clients
      set trainer_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
    where id = link_id;
  exception when others then
    failed := true;
  end;
  if not failed then
    raise exception 'FAIL 6: client repointed trainer_id at a victim';
  end if;

  -- The repoint attacker still cannot read victim C.
  perform pg_temp.login(a);
  if public.are_connected(a, 'cccccccc-cccc-cccc-cccc-cccccccccccc') then
    raise exception 'FAIL 6: repoint granted a connection to the victim';
  end if;
  select count(*) into leaked
    from public.personal_bests
   where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  if leaked <> 0 then
    raise exception 'FAIL 6: attacker read % victim rows after repoint attempt', leaked;
  end if;
  raise notice 'PASS 6: link parties are immutable; repoint rejected, no leak';

  reset role;
  raise notice 'BUG-019 PROOF PASSED';
end;
$$;

rollback;
