-- 00010_saved_blocks_rls_initplan_opt.sql
-- Re-create saved_blocks_owner using (select auth.uid()) form for InitPlan optimization.
-- Idempotent with 00009's final policy — safe to re-run.
-- ROLLBACK: drop policy if exists saved_blocks_owner on public.saved_blocks; create policy saved_blocks_owner on public.saved_blocks for all using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());
drop policy if exists saved_blocks_owner on public.saved_blocks;
create policy saved_blocks_owner on public.saved_blocks for all
  using (trainer_id = (select auth.uid()))
  with check (trainer_id = (select auth.uid()));
