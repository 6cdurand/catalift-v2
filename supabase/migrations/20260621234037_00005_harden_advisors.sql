-- ============================================================
-- Migration 00005: Advisor hardening (done while DB is empty)
-- 1. Lock set_updated_at search_path
-- 2. Revoke EXECUTE on helper functions from API roles
-- 3. Recreate all policies with (select auth.uid()) initplan optimization
-- ============================================================

-- 1. search_path -------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2. Helper functions are for triggers/RLS only, not the REST API ------------
revoke execute on function public.handle_new_user()                from anon, authenticated, public;
revoke execute on function public.are_connected(uuid, uuid)        from anon, authenticated, public;
revoke execute on function public.is_conversation_member(uuid, uuid) from anon, authenticated, public;

-- 3. Recreate policies with (select auth.uid()) ------------------------------

-- users
drop policy users_insert_own              on public.users;
drop policy users_update_own              on public.users;
drop policy users_select_self_or_connected on public.users;
create policy users_select_self_or_connected on public.users for select to authenticated
  using (id = (select auth.uid()) or public.are_connected((select auth.uid()), id));
create policy users_insert_own on public.users for insert to authenticated
  with check (id = (select auth.uid()));
create policy users_update_own on public.users for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- trainer_clients
drop policy tc_select_own     on public.trainer_clients;
drop policy tc_insert_trainer on public.trainer_clients;
drop policy tc_update_trainer on public.trainer_clients;
drop policy tc_delete_trainer on public.trainer_clients;
create policy tc_select_own on public.trainer_clients for select to authenticated
  using (trainer_id = (select auth.uid()) or client_id = (select auth.uid()));
create policy tc_insert_trainer on public.trainer_clients for insert to authenticated
  with check (trainer_id = (select auth.uid()));
create policy tc_update_trainer on public.trainer_clients for update to authenticated
  using (trainer_id = (select auth.uid())) with check (trainer_id = (select auth.uid()));
create policy tc_delete_trainer on public.trainer_clients for delete to authenticated
  using (trainer_id = (select auth.uid()));

-- workouts
drop policy workouts_select_self_or_trainer on public.workouts;
drop policy workouts_insert_own             on public.workouts;
drop policy workouts_update_own             on public.workouts;
drop policy workouts_delete_own             on public.workouts;
create policy workouts_select_self_or_trainer on public.workouts for select to authenticated
  using (user_id = (select auth.uid()) or public.are_connected((select auth.uid()), user_id));
create policy workouts_insert_own on public.workouts for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy workouts_update_own on public.workouts for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy workouts_delete_own on public.workouts for delete to authenticated
  using (user_id = (select auth.uid()));

-- personal_bests
drop policy pb_select_self_or_trainer on public.personal_bests;
drop policy pb_insert_own             on public.personal_bests;
drop policy pb_update_own             on public.personal_bests;
drop policy pb_delete_own             on public.personal_bests;
create policy pb_select_self_or_trainer on public.personal_bests for select to authenticated
  using (user_id = (select auth.uid()) or public.are_connected((select auth.uid()), user_id));
create policy pb_insert_own on public.personal_bests for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy pb_update_own on public.personal_bests for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy pb_delete_own on public.personal_bests for delete to authenticated
  using (user_id = (select auth.uid()));

-- client_exercise_history
drop policy ceh_select_self_or_trainer on public.client_exercise_history;
drop policy ceh_insert_own             on public.client_exercise_history;
drop policy ceh_update_own             on public.client_exercise_history;
drop policy ceh_delete_own             on public.client_exercise_history;
create policy ceh_select_self_or_trainer on public.client_exercise_history for select to authenticated
  using (user_id = (select auth.uid()) or public.are_connected((select auth.uid()), user_id));
create policy ceh_insert_own on public.client_exercise_history for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy ceh_update_own on public.client_exercise_history for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy ceh_delete_own on public.client_exercise_history for delete to authenticated
  using (user_id = (select auth.uid()));

-- conversations
drop policy conv_select_member on public.conversations;
drop policy conv_insert_member on public.conversations;
drop policy conv_update_member on public.conversations;
create policy conv_select_member on public.conversations for select to authenticated
  using ((select auth.uid()) in (participant_1, participant_2));
create policy conv_insert_member on public.conversations for insert to authenticated
  with check ((select auth.uid()) in (participant_1, participant_2));
create policy conv_update_member on public.conversations for update to authenticated
  using ((select auth.uid()) in (participant_1, participant_2))
  with check ((select auth.uid()) in (participant_1, participant_2));

-- messages
drop policy msg_select_member on public.messages;
drop policy msg_insert_sender on public.messages;
drop policy msg_update_member on public.messages;
create policy msg_select_member on public.messages for select to authenticated
  using (public.is_conversation_member(conversation_id, (select auth.uid())));
create policy msg_insert_sender on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.is_conversation_member(conversation_id, (select auth.uid())));
create policy msg_update_member on public.messages for update to authenticated
  using (public.is_conversation_member(conversation_id, (select auth.uid())))
  with check (public.is_conversation_member(conversation_id, (select auth.uid())));

-- notifications
drop policy notif_select_own on public.notifications;
drop policy notif_insert_own on public.notifications;
drop policy notif_update_own on public.notifications;
drop policy notif_delete_own on public.notifications;
create policy notif_select_own on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notif_insert_own on public.notifications for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy notif_update_own on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notif_delete_own on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

-- index the messages.sender_id FK (perf advisor)
create index messages_sender_idx on public.messages (sender_id);
