-- 00009_saved_blocks.sql
-- ROLLBACK: drop policy if exists saved_blocks_owner on public.saved_blocks; drop table if exists public.saved_blocks;
create table if not exists public.saved_blocks (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  block_type text not null check (block_type = any (array['straight','superset','circuit','cardio'])),
  folder text,
  block_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists saved_blocks_trainer_id_idx on public.saved_blocks (trainer_id);
create index if not exists saved_blocks_trainer_folder_idx on public.saved_blocks (trainer_id, folder);
alter table public.saved_blocks enable row level security;
create policy saved_blocks_owner on public.saved_blocks for all
  using (trainer_id = (select auth.uid()))
  with check (trainer_id = (select auth.uid()));
