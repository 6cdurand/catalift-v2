-- ============================================================
-- Migration 00004: Messaging + notifications
-- seen_at from day one (badge = COUNT WHERE seen_at IS NULL).
-- Ordered participant pair = one conversation per pair (INC participant-order fix).
-- ============================================================

-- ------------------------------------------------------------
-- conversations — one row per ordered participant pair
-- ------------------------------------------------------------
create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  participant_1   uuid not null references public.users(id) on delete cascade,
  participant_2   uuid not null references public.users(id) on delete cascade,
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),
  check (participant_1 <> participant_2),
  -- enforce canonical ordering so (a,b) and (b,a) can't both exist
  check (participant_1 < participant_2),
  unique (participant_1, participant_2)
);

create index conversations_p1_idx on public.conversations (participant_1);
create index conversations_p2_idx on public.conversations (participant_2);

alter table public.conversations enable row level security;

-- membership helper (SECURITY DEFINER to avoid recursive RLS)
create or replace function public.is_conversation_member(_conv uuid, _uid uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = _conv and _uid in (c.participant_1, c.participant_2)
  );
$$;

create policy conv_select_member on public.conversations for select to authenticated
  using (auth.uid() in (participant_1, participant_2));
create policy conv_insert_member on public.conversations for insert to authenticated
  with check (auth.uid() in (participant_1, participant_2));
create policy conv_update_member on public.conversations for update to authenticated
  using (auth.uid() in (participant_1, participant_2))
  with check (auth.uid() in (participant_1, participant_2));

-- ------------------------------------------------------------
-- messages
-- ------------------------------------------------------------
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.users(id) on delete cascade,
  body            text,
  photo_url       text,
  seen_at         timestamptz,
  created_at      timestamptz not null default now(),
  check (body is not null or photo_url is not null)
);

create index messages_conv_idx on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;

create policy msg_select_member on public.messages for select to authenticated
  using (public.is_conversation_member(conversation_id, auth.uid()));
create policy msg_insert_sender on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_conversation_member(conversation_id, auth.uid()));
-- recipient can mark seen (update seen_at); members only
create policy msg_update_member on public.messages for update to authenticated
  using (public.is_conversation_member(conversation_id, auth.uid()))
  with check (public.is_conversation_member(conversation_id, auth.uid()));

-- ------------------------------------------------------------
-- notifications — seen_at drives the badge
-- Cross-user creation handled by SECURITY DEFINER RPCs later;
-- baseline allows self-insert only (no spam vector).
-- ------------------------------------------------------------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  type       text not null check (type in ('message','booking','session_reminder','workout_assigned','pb_achieved','system')),
  title      text not null,
  body       text,
  data       jsonb,
  seen_at    timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_unseen_idx on public.notifications (user_id, seen_at) where seen_at is null;

alter table public.notifications enable row level security;

create policy notif_select_own on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notif_insert_own on public.notifications for insert to authenticated
  with check (user_id = auth.uid());
create policy notif_update_own on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notif_delete_own on public.notifications for delete to authenticated
  using (user_id = auth.uid());
