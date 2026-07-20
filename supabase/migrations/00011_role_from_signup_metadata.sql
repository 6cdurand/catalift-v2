-- ============================================================
-- Migration 00011: Derive public.users.role from signup metadata
--
-- v2 treats public.users.role as the single authority for user mode
-- (G-20). The signup wizard sends the intended role in auth user
-- metadata as `mode` (with `role` accepted as a fallback). The
-- `handle_new_user` trigger was only reading `full_name`, so every
-- new user defaulted to `role = 'client'`. This migration fixes
-- the trigger and backfills existing trainer accounts.
--
-- ROLLBACK:
--   1. Restore handle_new_user to the 00001/00005 version (no role
--      extraction; defaults to 'client').
--   2. Manual: update public.users set role = 'client' where role =
--      'trainer' and the backfill applied. (Not idempotent: existing
--      trainer-mode users would lose their role.)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Update the trigger to read `mode`/`role` from raw_user_meta_data
--    and validate against the users.role check constraint.
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  intended_role text;
begin
  -- Accept `mode` (current signup convention) or `role` as the key.
  intended_role := coalesce(
    nullif(new.raw_user_meta_data->>'mode', ''),
    nullif(new.raw_user_meta_data->>'role', '')
  );

  -- Enforce the same domain as the users.role check constraint.
  if intended_role not in ('client', 'trainer', 'admin') then
    intended_role := 'client';
  end if;

  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data->>'full_name', ''),
    intended_role
  )
  on conflict (id) do update
    set role = excluded.role,
        full_name = excluded.full_name,
        updated_at = now()
    where public.users.role is distinct from excluded.role
       or public.users.full_name is distinct from excluded.full_name;

  return new;
end;
$$;

-- ------------------------------------------------------------
-- 2. Backfill users who signed up as trainers but got role='client'.
--    We match public.users.id against auth.users.raw_user_meta_data.
--    This is safe to re-run: it only flips role from 'client' to
--    'trainer' when the auth metadata says trainer.
-- ------------------------------------------------------------
update public.users u
set role = 'trainer',
    updated_at = now()
where u.role = 'client'
  and exists (
    select 1
    from auth.users au
    where au.id = u.id
      and coalesce(au.raw_user_meta_data->>'mode', au.raw_user_meta_data->>'role') = 'trainer'
  );
