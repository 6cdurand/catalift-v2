"use client";

import { isFeatureEnabled } from "@/config/feature-flags";

/**
 * Trainer-invite acceptance seam.
 *
 * SCOPE (auth-ui, Option B): the `invitations` table + its RLS do NOT exist
 * yet. This seam is therefore GATED on `FEATURE_FLAGS.invites` (OFF) and
 * returns `disabled` instead of touching the DB. We do NOT fake a table and
 * we do NOT fall back to localStorage (G-02/G-03). The real implementation —
 * a server-verified, single-use, token-scoped invite that creates the
 * `trainer_clients` link via `users.id = auth.uid()` — lands with the
 * separate Class-B migration spec.
 *
 * SECURITY (G-25): when the flag turns on, verification MUST be server-side
 * and the setup/accept path MUST open ONLY for a server-verified valid token,
 * never on a bare `?email=` param.
 */
export type InviteVerifyResult =
  | { status: "disabled" }
  | { status: "valid"; email: string; trainerId: string }
  | { status: "invalid" }
  | { status: "expired" };

export async function verifyInviteToken(
  token: string,
): Promise<InviteVerifyResult> {
  if (!isFeatureEnabled("invites")) {
    return { status: "disabled" };
  }
  // TODO(auth-schema-followon): query the `invitations` table (server-verified,
  // single-use, token-scoped) and return the linked trainer + invitee email.
  void token;
  throw new Error("invitations table not provisioned");
}

export async function acceptInvite(
  token: string,
  userId: string,
): Promise<void> {
  if (!isFeatureEnabled("invites")) {
    throw new Error("invites disabled");
  }
  // TODO(auth-schema-followon): create the `trainer_clients` link with
  // client_id = auth.uid() (await + retry, G-11).
  void token;
  void userId;
}
