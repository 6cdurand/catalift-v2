"use client";

import { isFeatureEnabled } from "@/config/feature-flags";
import { getBrowserClient } from "@/lib/supabase";

/**
 * Trainer-invite acceptance + creation seam.
 *
 * The `invitations` table, `verify_invitation` / `accept_invitation` RPCs,
 * and `invitations_trainer_all` RLS policy are live. The verify/accept path
 * is gated on `FEATURE_FLAGS.invites` so it can be disabled without a deploy
 * if needed.
 *
 * SECURITY (G-25): verification is server-side via the `verify_invitation`
 * RPC. The accept path opens ONLY for a server-verified valid token, never
 * on a bare `?email=` param. The `accept_invitation` RPC is SECURITY DEFINER
 * and creates the `trainer_clients` link server-side — no client-side
 * auth/identity logic.
 */
export type InviteVerifyResult =
  | { status: "disabled" }
  | { status: "valid"; email: string; trainerId?: string }
  | { status: "invalid" }
  | { status: "expired" };

export async function verifyInviteToken(
  token: string,
): Promise<InviteVerifyResult> {
  if (!isFeatureEnabled("invites")) {
    return { status: "disabled" };
  }

  const supabase = getBrowserClient();
  const { data, error } = await supabase.rpc("verify_invitation", {
    p_token: token,
  });

  if (error || !data) {
    return { status: "invalid" };
  }

  const row = data as { email: string; trainer_name: string; valid: boolean };
  if (row.valid) {
    return { status: "valid", email: row.email };
  }
  return { status: "invalid" };
}

export async function acceptInvite(
  token: string,
  userId: string,
): Promise<void> {
  if (!isFeatureEnabled("invites")) {
    throw new Error("invites disabled");
  }

  const supabase = getBrowserClient();
  const { error } = await supabase.rpc("accept_invitation", {
    p_token: token,
  });

  if (error) {
    throw error;
  }

  // userId is not used directly — the SECURITY DEFINER RPC uses auth.uid()
  // internally. The param is kept for API compatibility with the /invite page.
  void userId;
}

/**
 * Creates an invitation row for a trainer to invite a client by email.
 *
 * Inserts into `invitations` with `trainer_id = auth.uid()` (RLS-enforced).
 * Returns the invite link URL the trainer can send to their client.
 */
export async function createInvitation(
  email: string,
): Promise<string> {
  const supabase = getBrowserClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const token = crypto.randomUUID();

  const { error } = await supabase.from("invitations").insert({
    trainer_id: user.id,
    email,
    token,
    role: "client",
    status: "pending",
  });

  if (error) {
    throw error;
  }

  return `${window.location.origin}/invite?token=${token}`;
}
