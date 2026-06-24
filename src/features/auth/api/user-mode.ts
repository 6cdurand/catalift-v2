"use client";

import { getBrowserClient } from "@/lib/supabase";
import type { UserRole } from "../types";

const MAX_RETRIES = 3;

/**
 * Resolves a Catalift role from Supabase auth user metadata.
 *
 * The app reads `user.user_metadata.mode` as the source of truth for role
 * (see `components/layouts/_shell-stubs.ts`). Anything unexpected falls back
 * to `client`.
 */
export function readUserMode(
  metadata: Record<string, unknown> | null | undefined,
): UserRole {
  return metadata?.mode === "trainer" ? "trainer" : "client";
}

/**
 * Mirrors the authenticated user's mode into `public.users.role`.
 *
 * Source of truth is auth metadata (`user_metadata.mode`); this keeps the DB
 * profile row consistent for server-side / RLS consumers. Requires an active
 * session — the RLS `users_update_own` policy enforces `id = auth.uid()`.
 *
 * Awaited with retry + exponential backoff per the await-write pattern (G-11).
 * No fire-and-forget.
 */
export async function syncUserModeToProfile(
  userId: string,
  mode: UserRole,
): Promise<void> {
  const supabase = getBrowserClient();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { error } = await supabase
        .from("users")
        .update({ role: mode })
        .eq("id", userId);

      if (error) throw error;
      return; // success
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        console.error(
          `syncUserModeToProfile failed after ${MAX_RETRIES} attempts:`,
          err,
        );
        throw err;
      }
      // Exponential backoff: 1s, 2s
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)),
      );
    }
  }
}
