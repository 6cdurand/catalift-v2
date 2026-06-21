-- ============================================================
-- Migration 00001: Identity foundation
-- v2 fix for v1's #1 bug class (INC-002/003/004):
-- public.users.id IS auth.users.id (one identity domain, no divergence)
-- ============================================================

-- Shared helper: auto-update updated_at on row change
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- public.users — mirrors auth.users 1:1 (id === auth.users.id)
-- ------------------------------------------------------------
create table public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  full_name     text,
  role          text not null default 'client' check (role in ('client','trainer','admin')),
  avatar_url    text,
  date_of_birth date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.users is 'App profile. PK = auth.users.id (no separate identity domain). RLS: self-access only at baseline; trainer<->client read added in 00002.';

alter table public.users enable row level security;

-- RLS: a user can read / insert / update ONLY their own row.
-- No permissive USING(true). No anon access. No DELETE (account deletion
-- is a server-side cascade from auth.users).
create policy users_select_own
  on public.users for select
  to authenticated
  using (id = auth.uid());

create policy users_insert_own
  on public.users for insert
  to authenticated
  with check (id = auth.uid());

create policy users_update_own
  on public.users for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Auto-create the profile row when an auth user signs up.
-- SECURITY DEFINER so it can insert regardless of the caller's role.
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
