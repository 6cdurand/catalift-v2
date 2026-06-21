-- ============================================================
-- Migration 00002: Trainer<->client relationship spine
-- One session-counting authority (historical_offset_sessions).
-- RLS-enforced isolation: trainers see only their clients.
-- ============================================================

create table public.trainer_clients (
  id                         uuid primary key default gen_random_uuid(),
  trainer_id                 uuid not null references public.users(id) on delete cascade,
  client_id                  uuid not null references public.users(id) on delete cascade,
  status                     text not null default 'active' check (status in ('active','inactive','pending','archived')),
  -- AUTHORITATIVE session offset (replaces v1's 4 competing offset columns; INC-002 fix)
  historical_offset_sessions integer not null default 0,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  unique (trainer_id, client_id),
  check (trainer_id <> client_id)
);

comment on table public.trainer_clients is 'Trainer<->client links. historical_offset_sessions is the ONE session-count authority (INC-002). No offset-mutating triggers.';

create index trainer_clients_trainer_idx on public.trainer_clients (trainer_id);
create index trainer_clients_client_idx  on public.trainer_clients (client_id);

alter table public.trainer_clients enable row level security;

create trigger trainer_clients_set_updated_at
  before update on public.trainer_clients
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Relationship helper (SECURITY DEFINER bypasses RLS to avoid
-- recursive policy evaluation). True if a and b are linked.
-- ------------------------------------------------------------
create or replace function public.are_connected(_a uuid, _b uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.trainer_clients tc
    where (tc.trainer_id = _a and tc.client_id = _b)
       or (tc.trainer_id = _b and tc.client_id = _a)
  );
$$;

-- ------------------------------------------------------------
-- trainer_clients RLS: each side sees its own links; only the
-- trainer manages the link.
-- ------------------------------------------------------------
create policy tc_select_own
  on public.trainer_clients for select
  to authenticated
  using (trainer_id = auth.uid() or client_id = auth.uid());

create policy tc_insert_trainer
  on public.trainer_clients for insert
  to authenticated
  with check (trainer_id = auth.uid());

create policy tc_update_trainer
  on public.trainer_clients for update
  to authenticated
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

create policy tc_delete_trainer
  on public.trainer_clients for delete
  to authenticated
  using (trainer_id = auth.uid());

-- ------------------------------------------------------------
-- Extend users SELECT: also allow reading a connected user's
-- profile (trainer<->client). Replaces the self-only baseline.
-- ------------------------------------------------------------
drop policy users_select_own on public.users;

create policy users_select_self_or_connected
  on public.users for select
  to authenticated
  using (id = auth.uid() or public.are_connected(auth.uid(), id));
