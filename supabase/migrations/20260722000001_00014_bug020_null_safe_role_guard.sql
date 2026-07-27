-- ============================================================
-- Migration 00014: BUG-020 — NULL-safe role guard in handle_new_user
--
-- ROOT CAUSE (confirmed live 2026-07-22): when a signup sends NO
-- role metadata (both `mode` and `role` absent/empty), the 00011
-- trigger set intended_role := NULL, and its guard
--   `if intended_role not in ('client','trainer','admin')`
-- is NULL-blind: `NULL not in (...)` evaluates to NULL (not true),
-- so the reset-to-'client' branch never fired. intended_role stayed
-- NULL and the insert into public.users(role) violated the
-- role NOT NULL constraint -> the entire signup transaction FAILED.
--
-- FIX: one line — make the guard NULL-safe:
--   `if intended_role is null or intended_role not in (...)`
-- Everything else is ported byte-for-byte from the live 00011 body
-- (SECURITY DEFINER, set search_path='', the on conflict block).
-- No trigger re-creation is needed: on_auth_user_created (00001)
-- already points at public.handle_new_user().
--
-- IDEMPOTENT: `create or replace function` — applying to live (which
-- will hold this exact body after Christo applies it) is a no-op.
--
-- ROLLBACK: restore the 00011 body (guard without the NULL check):
--   create or replace function public.handle_new_user() ...
--     if intended_role not in ('client','trainer','admin') then
--       intended_role := 'client';
--     end if;
--   ... (re-introduces BUG-020; not recommended)
-- ============================================================

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

  -- FIX (BUG-020): NULL-safe guard. `NULL not in (...)` is NULL, not
  -- true, so without the explicit IS NULL check a metadata-less signup
  -- kept a NULL role and violated users.role NOT NULL.
  if intended_role is null or intended_role not in ('client', 'trainer', 'admin') then
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
