-- ============================================================
-- Migration 00015: BUG-021 — accept_invitation must enforce email match
--
-- PURPOSE: The live accept_invitation(p_token text) binds auth.uid()
-- straight into trainer_clients without comparing the invited email
-- (v_inv.email) against the logged-in user's email. A different
-- logged-in user who opens any valid invite link is silently bound
-- to that trainer.
--
-- FIX: After looking up the invitation and validating status/expiry,
-- fetch the authenticated user's email from auth.users and compare
-- it (case-insensitive) against v_inv.email. If they differ, raise
-- an exception with errcode 'P0010' and message 'email_mismatch'
-- so the client can detect it and show a targeted UI.
--
-- ROLLBACK:
--   -- Restore the original function body (no email check):
--   create or replace function public.accept_invitation(p_token text)
--   returns uuid language plpgsql security definer set search_path to 'public'
--   as $$
--   declare
--     v_uid uuid := auth.uid();
--     v_inv public.invitations%rowtype;
--   begin
--     if v_uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
--     select * into v_inv from public.invitations where token = p_token for update;
--     if not found then raise exception 'invitation not found' using errcode = 'P0002'; end if;
--     if v_inv.status <> 'pending' or v_inv.expires_at <= now() then
--       raise exception 'invitation is not valid' using errcode = 'P0001';
--     end if;
--     update public.invitations set status='accepted', accepted_at=now(), accepted_user=v_uid where id=v_inv.id;
--     insert into public.trainer_clients (trainer_id, client_id, status)
--     values (v_inv.trainer_id, v_uid, 'active')
--     on conflict (trainer_id, client_id) do update set status='active';
--     return v_inv.trainer_id;
--   end; $$;
-- ============================================================

create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.invitations%rowtype;
  v_user_email text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

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

  -- BUG-021: enforce that the logged-in user's email matches the invited email.
  select email into v_user_email from auth.users where id = v_uid;
  if v_user_email is null then
    raise exception 'authenticated user has no email' using errcode = '28000';
  end if;
  if lower(trim(v_user_email)) <> lower(trim(v_inv.email)) then
    raise exception 'email_mismatch' using errcode = 'P0010';
  end if;

  update public.invitations
    set status = 'accepted', accepted_at = now(), accepted_user = v_uid
  where id = v_inv.id;

  insert into public.trainer_clients (trainer_id, client_id, status)
  values (v_inv.trainer_id, v_uid, 'active')
  on conflict (trainer_id, client_id) do update set status = 'active';

  return v_inv.trainer_id;
end; $$;
