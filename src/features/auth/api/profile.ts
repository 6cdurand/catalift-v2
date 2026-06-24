"use client";

import { getBrowserClient } from "@/lib/supabase";
import type { UserRole } from "../types";

const MAX_RETRIES = 3;

/**
 * Fields the signup wizard / onboarding can persist to `public.users`.
 *
 * SCOPE (auth-ui, Option B): only columns that EXIST on `public.users` today
 * — `full_name`, `role`, `date_of_birth`. The wizard also collects
 * username / gender / height / weight, but those columns do not exist yet,
 * so they are intentionally NOT written here. They land with the separate
 * Class-B migration spec. See `// TODO(auth-schema-followon)` at call sites.
 */
export interface ProfileUpdate {
  fullName?: string;
  role?: UserRole;
  /** ISO `YYYY-MM-DD`. Empty string is treated as "no value" (NULL). */
  dateOfBirth?: string;
}

/**
 * Writes the profile row for the authenticated user (G-01: `id = auth.uid()`).
 *
 * Awaited with retry + exponential backoff per the await-write pattern (G-11).
 * No fire-and-forget. The row itself is created by the `handle_new_user`
 * trigger at signup; this update fills in the user-supplied fields.
 */
export async function upsertProfile(
  userId: string,
  update: ProfileUpdate,
): Promise<void> {
  const row: Record<string, string | null> = {};
  if (update.fullName !== undefined) row.full_name = update.fullName || null;
  if (update.role !== undefined) row.role = update.role;
  if (update.dateOfBirth !== undefined)
    row.date_of_birth = update.dateOfBirth || null;

  if (Object.keys(row).length === 0) return;

  const supabase = getBrowserClient();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { error } = await supabase.from("users").update(row).eq("id", userId);
      if (error) throw error;
      return; // success
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        console.error(
          `upsertProfile failed after ${MAX_RETRIES} attempts:`,
          err,
        );
        throw err;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)),
      );
    }
  }
}
