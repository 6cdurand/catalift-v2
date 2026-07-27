-- ============================================================
-- BUG-020 behavioral proof for migration 00014.
-- Run AFTER 00014 is applied, against a Supabase dev branch (or
-- the SQL editor). Wrapped in a transaction that ROLLS BACK, so
-- it seeds + cleans up and leaves no rows behind.
--
-- Each assertion RAISES on failure; a clean run prints the
-- NOTICE lines and ends with "BUG-020 PROOF PASSED".
--
-- The on_auth_user_created trigger (00001) fires AFTER INSERT on
-- auth.users and runs public.handle_new_user(), which inserts the
-- public.users profile row. So each auth.users insert below
-- exercises the trigger directly.
--
-- Pre-fix (00011) behaviour: cases with NO role metadata left
-- intended_role = NULL (NULL not in (...) is NULL, not true), so
-- the insert violated users.role NOT NULL and the whole
-- transaction FAILED. Post-fix (00014) they default to 'client'.
-- ============================================================
begin;

do $$
declare
  r text;
begin
  -- ========================================================
  -- 1. BUG-020 repro: empty metadata object -> role defaults
  --    to 'client' (previously: NOT NULL violation -> signup fail).
  -- ========================================================
  insert into auth.users (id, email, raw_user_meta_data)
  values ('d0000000-0000-0000-0000-000000000001', 'nometa@proof.test', '{}'::jsonb);

  select role into r from public.users where id = 'd0000000-0000-0000-0000-000000000001';
  if r is distinct from 'client' then
    raise exception 'FAIL 1: empty metadata gave role=%, expected client', r;
  end if;
  raise notice 'PASS 1: empty {} metadata -> role=client (no NOT NULL failure)';

  -- ========================================================
  -- 2. NULL raw_user_meta_data entirely -> role 'client'.
  -- ========================================================
  insert into auth.users (id, email, raw_user_meta_data)
  values ('d0000000-0000-0000-0000-000000000002', 'nullmeta@proof.test', null);

  select role into r from public.users where id = 'd0000000-0000-0000-0000-000000000002';
  if r is distinct from 'client' then
    raise exception 'FAIL 2: null metadata gave role=%, expected client', r;
  end if;
  raise notice 'PASS 2: null metadata -> role=client';

  -- ========================================================
  -- 3. mode=trainer still yields role 'trainer' (no regression).
  -- ========================================================
  insert into auth.users (id, email, raw_user_meta_data)
  values ('d0000000-0000-0000-0000-000000000003', 'trainer@proof.test', '{"mode":"trainer"}'::jsonb);

  select role into r from public.users where id = 'd0000000-0000-0000-0000-000000000003';
  if r is distinct from 'trainer' then
    raise exception 'FAIL 3: mode=trainer gave role=%, expected trainer', r;
  end if;
  raise notice 'PASS 3: mode=trainer -> role=trainer';

  -- ========================================================
  -- 4. `role` fallback key still works (role=admin -> admin).
  -- ========================================================
  insert into auth.users (id, email, raw_user_meta_data)
  values ('d0000000-0000-0000-0000-000000000004', 'admin@proof.test', '{"role":"admin"}'::jsonb);

  select role into r from public.users where id = 'd0000000-0000-0000-0000-000000000004';
  if r is distinct from 'admin' then
    raise exception 'FAIL 4: role=admin gave role=%, expected admin', r;
  end if;
  raise notice 'PASS 4: role=admin fallback key -> role=admin';

  -- ========================================================
  -- 5. Out-of-domain value is coerced to 'client'.
  -- ========================================================
  insert into auth.users (id, email, raw_user_meta_data)
  values ('d0000000-0000-0000-0000-000000000005', 'bogus@proof.test', '{"mode":"superadmin"}'::jsonb);

  select role into r from public.users where id = 'd0000000-0000-0000-0000-000000000005';
  if r is distinct from 'client' then
    raise exception 'FAIL 5: invalid mode gave role=%, expected client', r;
  end if;
  raise notice 'PASS 5: invalid role value -> coerced to client';

  raise notice 'BUG-020 PROOF PASSED';
end;
$$;

rollback;
