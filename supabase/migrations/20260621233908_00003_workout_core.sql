-- ============================================================
-- Migration 00003: Workout core
-- Volume = SUM (not v1's MAX bug). PBs upsert on (user_id, exercise_id).
-- Owner writes; owner + connected trainer read.
-- ============================================================

-- ------------------------------------------------------------
-- workouts — a logged/performed workout session
-- exercises/sets kept as jsonb for now; normalized during the
-- workout-engine port. total_volume is the SUM across all sets.
-- ------------------------------------------------------------
create table public.workouts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  name          text,
  performed_at  timestamptz not null default now(),
  total_volume  numeric not null default 0,
  exercises     jsonb not null default '[]'::jsonb,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on column public.workouts.total_volume is 'SUM(weight*reps) across ALL sets/exercises. v1 bug recorded MAX of a single set.';

create index workouts_user_idx on public.workouts (user_id, performed_at desc);

alter table public.workouts enable row level security;
create trigger workouts_set_updated_at before update on public.workouts for each row execute function public.set_updated_at();

create policy workouts_select_self_or_trainer on public.workouts for select to authenticated
  using (user_id = auth.uid() or public.are_connected(auth.uid(), user_id));
create policy workouts_insert_own on public.workouts for insert to authenticated with check (user_id = auth.uid());
create policy workouts_update_own on public.workouts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy workouts_delete_own on public.workouts for delete to authenticated using (user_id = auth.uid());

-- ------------------------------------------------------------
-- personal_bests — one row per (user, exercise); upsert target.
-- Keeps v1 column names (one_rm, not one_rep_max). Adds best_volume.
-- ------------------------------------------------------------
create table public.personal_bests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  exercise_id   text not null,
  exercise_name text,
  weight        numeric,
  reps          integer,
  one_rm        numeric,
  best_volume   numeric,
  achieved_on   date not null default current_date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, exercise_id)
);

create index personal_bests_user_idx on public.personal_bests (user_id);

alter table public.personal_bests enable row level security;
create trigger personal_bests_set_updated_at before update on public.personal_bests for each row execute function public.set_updated_at();

create policy pb_select_self_or_trainer on public.personal_bests for select to authenticated
  using (user_id = auth.uid() or public.are_connected(auth.uid(), user_id));
create policy pb_insert_own on public.personal_bests for insert to authenticated with check (user_id = auth.uid());
create policy pb_update_own on public.personal_bests for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy pb_delete_own on public.personal_bests for delete to authenticated using (user_id = auth.uid());

-- ------------------------------------------------------------
-- client_exercise_history — recent-exercise list, one row per
-- (user, exercise), updated by the completion pipeline.
-- ------------------------------------------------------------
create table public.client_exercise_history (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  exercise_id       text not null,
  exercise_name     text,
  last_performed_at timestamptz not null default now(),
  last_weight       numeric,
  last_reps         integer,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, exercise_id)
);

create index ceh_user_idx on public.client_exercise_history (user_id, last_performed_at desc);

alter table public.client_exercise_history enable row level security;
create trigger ceh_set_updated_at before update on public.client_exercise_history for each row execute function public.set_updated_at();

create policy ceh_select_self_or_trainer on public.client_exercise_history for select to authenticated
  using (user_id = auth.uid() or public.are_connected(auth.uid(), user_id));
create policy ceh_insert_own on public.client_exercise_history for insert to authenticated with check (user_id = auth.uid());
create policy ceh_update_own on public.client_exercise_history for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ceh_delete_own on public.client_exercise_history for delete to authenticated using (user_id = auth.uid());
