-- ============================================================
-- Migration 00006: Auth profile fields + invitations
-- Follow-on to auth-ui (the deferred `// TODO(auth-schema-followon)` stubs).
-- Part 1: profile columns on public.users (all nullable, no backfill).
-- Part 2: public.invitations (trainer -> client, token-scoped, single-use)
--         + verify_invitation (anon, security definer) + accept_invitation
--         (authenticated, security definer, atomic single-use).
-- ROLLBACK:
--   drop function if exists public.accept_invitation(text);
--   drop function if exists public.verify_invitation(text);
--   drop table if exists public.invitations;
--   alter table public.users
--     drop column if exists weight_kg,
--     drop column if exists height_cm,
--     drop column if exists gender,
--     drop column if exists username;
-- ============================================================

-- ------------------------------------------------------------
-- Part 1 — public.users profile columns
-- RLS unchanged: the existing self-access policy (users_update_own /
-- users_select_self_or_connected) already covers these columns (same row).
-- ------------------------------------------------------------
alter table public.users
  add column if not exists username   text unique,
  add column if not exists gender     text check (gender in ('male','female','other','prefer_not_to_say')),
  add column if not exists height_cm  numeric check (height_cm > 0 and height_cm < 300),
  add column if not exists weight_kg  numeric check (weight_kg > 0 and weight_kg < 700);

-- ------------------------------------------------------------
-- Part 2 — public.invitations
-- ------------------------------------------------------------
create table if not exists public.invitations (
  id            uuid primary key default gen_random_uuid(),
  trainer_id    uuid not null references public.users(id) on delete cascade,
  email         text not null,
  token         text not null unique,
  role          text not null default 'client' check (role in ('client')),
  status        text not null default 'pending' check (status in ('pending','accepted','expired','revoked')),
  expires_at    timestamptz not null default (now() + interval '7 days'),
  accepted_at   timestamptz,
  accepted_user uuid references public.users(id),
  created_at    timestamptz not null default now()
);

comment on table public.invitations is 'Trainer->client invites. Token-scoped + single-use. NO public select; anon token check goes through verify_invitation() (security definer) to prevent token enumeration.';

create index if not exists invitations_token_idx         on public.invitations (token);
create index if not exists invitations_trainer_idx       on public.invitations (trainer_id);
create index if not exists invitations_accepted_user_idx on public.invitations (accepted_user);

alter table public.invitations enable row level security;

-- RLS: ONLY the owning trainer can manage their invites (create/list/revoke).
-- No anon/public policy at all -> the anon role cannot read this table; the
-- only anon path is the security-definer verify_invitation() RPC below.
-- (select auth.uid()) keeps the initplan optimization (advisor: auth_rls_initplan).
create policy invitations_trainer_all
  on public.invitations for all
  to authenticated
  using (trainer_id = (select auth.uid()))
  with check (trainer_id = (select auth.uid()));

-- ------------------------------------------------------------
-- verify_invitation(token) — anon-callable token check.
-- Returns ONLY (email, trainer_name, valid). No table-wide read, so the anon
-- role cannot enumerate tokens. valid = pending AND not expired.
-- ------------------------------------------------------------
create or replace function public.verify_invitation(p_token text)
returns table (email text, trainer_name text, valid boolean)
language sql
security definer
set search_path = public
as $$
  select i.email,
         u.full_name as trainer_name,
         (i.status = 'pending' and i.expires_at > now()) as valid
  from public.invitations i
  join public.users u on u.id = i.trainer_id
  where i.token = p_token;
$$;

revoke all on function public.verify_invitation(text) from public;
grant execute on function public.verify_invitation(text) to anon, authenticated;

-- ------------------------------------------------------------
-- accept_invitation(token) — authenticated, atomic, single-use.
-- Re-checks pending + unexpired under a row lock, flips status to 'accepted'
-- (single-use), and creates the trainer_clients link with
-- client_id = auth.uid() (G-01). Raises if invalid/expired/already used.
-- ------------------------------------------------------------
create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.invitations%rowtype;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  -- Lock the row so concurrent accepts cannot double-spend the token.
  select * into v_inv
  from public.invitations
  where token = p_token
  for update;

  if not found then
    raise exception 'invitation not found' using errcode = 'P0002';
  end if;

  if v_inv.status <> 'pending' or v_inv.expires_at <= now() then
    raise exception 'invitation is not valid' using errcode = 'P0001';
  end if;

  update public.invitations
    set status = 'accepted',
        accepted_at = now(),
        accepted_user = v_uid
  where id = v_inv.id;

  insert into public.trainer_clients (trainer_id, client_id, status)
  values (v_inv.trainer_id, v_uid, 'active')
  on conflict (trainer_id, client_id) do update set status = 'active';

  return v_inv.trainer_id;
end;
$$;

revoke all on function public.accept_invitation(text) from public, anon;
grant execute on function public.accept_invitation(text) to authenticated;
