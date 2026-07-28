-- ============================================================
-- Migration 00016: Payments + Sessions data layer
--
-- Adds the three tables/columns that make completed/paid/outstanding
-- derive from a single source of truth:
--   1. client_sessions  — completed-session ledger (counting authority)
--   2. client_payments  — payment ledger (sessions_included per payment)
--   3. trainer_clients  — + total_paid_offset, price_per_session
--
-- RLS: trainer owns their rows; client can read their own.
-- No triggers that mutate historical_offset_sessions (INC-002 authority).
--
-- ROLLBACK:
--   drop table if exists public.client_sessions cascade;
--   drop table if exists public.client_payments cascade;
--   alter table public.trainer_clients drop column if exists total_paid_offset;
--   alter table public.trainer_clients drop column if exists price_per_session;
-- ============================================================

-- ------------------------------------------------------------
-- 1. client_sessions: completed-session ledger
-- ------------------------------------------------------------
create table if not exists public.client_sessions (
  id                uuid primary key default gen_random_uuid(),
  trainer_id        uuid not null references public.users(id) on delete cascade,
  client_id         uuid not null references public.users(id) on delete cascade,
  session_date      date not null default ((now() at time zone 'utc')::date),
  source            text not null default 'pt_completion'
                    check (source in ('pt_completion','booking','manual_plus_one')),
  workout_id        uuid references public.workouts(id) on delete set null,
  calendar_event_id text,
  notes             text,
  created_at        timestamptz not null default now()
);

alter table public.client_sessions enable row level security;

-- Dedupe: unique(client_id, calendar_event_id) where not null
create unique index if not exists client_sessions_dedupe_event
  on public.client_sessions (client_id, calendar_event_id)
  where calendar_event_id is not null;

-- Dedupe: unique(client_id, workout_id) where not null
create unique index if not exists client_sessions_dedupe_workout
  on public.client_sessions (client_id, workout_id)
  where workout_id is not null;

-- Pair lookup index
create index if not exists client_sessions_pair_idx
  on public.client_sessions (trainer_id, client_id);

-- RLS: trainer full CRUD, client read-only
create policy client_sessions_trainer_all
  on public.client_sessions for all
  to authenticated
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

create policy client_sessions_client_read
  on public.client_sessions for select
  to authenticated
  using (client_id = auth.uid());

-- ------------------------------------------------------------
-- 2. client_payments: payment ledger
-- ------------------------------------------------------------
create table if not exists public.client_payments (
  id                uuid primary key default gen_random_uuid(),
  trainer_id        uuid not null references public.users(id) on delete cascade,
  client_id         uuid not null references public.users(id) on delete cascade,
  amount            numeric not null check (amount >= 0),
  currency          text not null default 'NZD',
  sessions_included integer not null default 1 check (sessions_included >= 0),
  method            text check (method in ('cash','card','bank_transfer','other')),
  status            text not null default 'paid'
                    check (status in ('pending','paid','overdue','refunded')),
  description       text,
  paid_at           timestamptz,
  created_at        timestamptz not null default now()
);

alter table public.client_payments enable row level security;

-- Pair lookup index
create index if not exists client_payments_pair_idx
  on public.client_payments (trainer_id, client_id);

-- RLS: trainer full CRUD, client read-only
create policy client_payments_trainer_all
  on public.client_payments for all
  to authenticated
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

create policy client_payments_client_read
  on public.client_payments for select
  to authenticated
  using (client_id = auth.uid());

-- ------------------------------------------------------------
-- 3. trainer_clients: add total_paid_offset + price_per_session
-- ------------------------------------------------------------
alter table public.trainer_clients
  add column if not exists total_paid_offset integer not null default 0;

alter table public.trainer_clients
  add column if not exists price_per_session numeric;
