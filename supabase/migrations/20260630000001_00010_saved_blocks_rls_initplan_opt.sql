-- 00010_saved_blocks_rls_initplan_opt.sql
-- Perf: wrap auth.uid() in a scalar subselect (Supabase auth_rls_initplan advisor). Semantics identical to 00009.
-- ROLLBACK: drop policy if exists saved_blocks_owner on public.saved_blocks;
--   create policy saved_blocks_owner on public.saved_blocks for all
--   using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());
drop policy if exists saved_blocks_owner on public.saved_blocks;
create policy saved_blocks_owner on public.saved_blocks for all
  using (trainer_id = (select auth.uid()))
  with check (trainer_id = (select auth.uid()));
