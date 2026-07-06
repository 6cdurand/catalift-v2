"use client";

import { v4 as uuidv4 } from "uuid";
import { getBrowserClient } from "@/lib/supabase";
import type { Database } from "@/types/database";

type InvitationInsert = Database["public"]["Tables"]["invitations"]["Insert"];

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 300;

/**
 * Retry wrapper for DB writes (G-11) — mirrors the local pattern in
 * programs/api/blocks.ts so trainer-ops stays free of cross-feature imports.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  operationName: string,
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        console.error(
          `[invitations.${operationName}] failed after ${MAX_RETRIES} attempts:`,
          err,
        );
        throw err;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, attempt - 1)),
      );
    }
  }
  throw new Error(`[invitations.${operationName}] retry exhausted`);
}

export interface CreateInvitationResult {
  token: string;
  email: string;
}

/**
 * createInvitation — a trainer invites a new client by email (Class A, no schema
 * change: the `invitations` table already exists).
 *
 * INSERTs a single-use, token-scoped row into `public.invitations`, backed by the
 * `invitations_trainer_all` RLS policy (with_check `trainer_id = auth.uid()`), so
 * a trainer can only create their own invites. `role`/`status`/`expires_at` use DB
 * defaults ('client' / 'pending' / now()+7d). The token is a client-generated uuid;
 * the invitee later redeems it via `accept_invitation()` (SECURITY DEFINER).
 *
 * G-11: awaited with retry. Throws on terminal failure so the caller surfaces it.
 */
export async function createInvitation(
  email: string,
): Promise<CreateInvitationResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("Email is required");
  }

  const supabase = getBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const token = uuidv4();

  return withRetry(async () => {
    const insert: InvitationInsert = {
      trainer_id: user.id,
      email: normalizedEmail,
      token,
    };

    const { error } = await supabase.from("invitations").insert(insert);
    if (error) throw error;

    return { token, email: normalizedEmail };
  }, "createInvitation");
}
