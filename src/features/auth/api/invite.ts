"use client";

import { getBrowserClient } from "@/lib/supabase";
import { isFeatureEnabled } from "@/config/feature-flags";

const MAX_RETRIES = 3;

/**
 * Trainer-invite acceptance seam (migration 00006).
 *
 * Token verification is SERVER-SIDE only: the anon role cannot read
 * `public.invitations` (no public RLS policy), so we call the
 * `verify_invitation` security-definer RPC, which returns only
 * (email, trainer_name, valid) for a single token — no table-wide read, no
 * token enumeration. No localStorage fallback (G-02/G-03).
 *
 * SECURITY (G-25): the setup/accept path opens ONLY for a server-verified
 * valid token, never on a bare `?email=` param.
 */
export type InviteVerifyResult =
  | { status: "disabled" }
  | { status: "valid"; email: string; trainerName: string | null }
  | { status: "invalid" };

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
  if (error) throw error;

  // The RPC returns at most one row. valid = pending AND not expired; any
  // non-valid state (expired / accepted / revoked / unknown) collapses to
  // `invalid` so we never leak which it was.
  const match = Array.isArray(data) ? data[0] : data;
  if (!match || !match.valid) {
    return { status: "invalid" };
  }
  return {
    status: "valid",
    email: match.email,
    trainerName: match.trainer_name ?? null,
  };
}

/**
 * Accepts an invite via the `accept_invitation` security-definer RPC, which
 * atomically re-checks pending+unexpired, flips the invite to `accepted`
 * (single-use), and creates the `trainer_clients` link with
 * `client_id = auth.uid()` (G-01). `userId` is accepted for call-site clarity
 * but the link is keyed off `auth.uid()` server-side, never this argument.
 *
 * Awaited with retry + exponential backoff (G-11). A re-used / invalid token
 * raises inside the RPC and surfaces as a thrown error here.
 */
export async function acceptInvite(
  token: string,
  userId: string,
): Promise<void> {
  if (!isFeatureEnabled("invites")) {
    throw new Error("invites disabled");
  }
  void userId; // server uses auth.uid(); see doc comment.

  const supabase = getBrowserClient();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { error } = await supabase.rpc("accept_invitation", {
        p_token: token,
      });
      if (error) throw error;
      return; // success
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        console.error(`acceptInvite failed after ${MAX_RETRIES} attempts:`, err);
        throw err;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)),
      );
    }
  }
}
