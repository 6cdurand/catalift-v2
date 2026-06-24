"use client";

import { getBrowserClient } from "@/lib/supabase";
import type { UserRole } from "../types";

const MAX_RETRIES = 3;

/** Postgres unique-violation SQLSTATE. */
const UNIQUE_VIOLATION = "23505";

/**
 * Thrown when the chosen `username` collides with the `users.username UNIQUE`
 * constraint. Surfaced to the signup seam so it can show "username taken"
 * instead of a generic failure. Not retried (a retry would never succeed).
 */
export class UsernameTakenError extends Error {
  constructor() {
    super("That username is already taken.");
    this.name = "UsernameTakenError";
  }
}

export type Gender = "male" | "female" | "other" | "prefer_not_to_say";

/**
 * Fields the signup wizard / onboarding can persist to `public.users`.
 *
 * `username` / `gender` / `height_cm` / `weight_kg` land via migration 00006
 * (auth-schema-followon). All optional; only provided keys are written.
 */
export interface ProfileUpdate {
  fullName?: string;
  role?: UserRole;
  /** ISO `YYYY-MM-DD`. Empty string is treated as "no value" (NULL). */
  dateOfBirth?: string;
  /** Unique across `public.users`. Collision -> `UsernameTakenError`. */
  username?: string;
  gender?: Gender;
  /** Centimetres. Non-positive / NaN is treated as "no value" (NULL). */
  heightCm?: number;
  /** Kilograms. Non-positive / NaN is treated as "no value" (NULL). */
  weightKg?: number;
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
  const row: Record<string, string | number | null> = {};
  if (update.fullName !== undefined) row.full_name = update.fullName || null;
  if (update.role !== undefined) row.role = update.role;
  if (update.dateOfBirth !== undefined)
    row.date_of_birth = update.dateOfBirth || null;
  if (update.username !== undefined) row.username = update.username || null;
  if (update.gender !== undefined) row.gender = update.gender || null;
  if (update.heightCm !== undefined)
    row.height_cm =
      Number.isFinite(update.heightCm) && update.heightCm > 0
        ? update.heightCm
        : null;
  if (update.weightKg !== undefined)
    row.weight_kg =
      Number.isFinite(update.weightKg) && update.weightKg > 0
        ? update.weightKg
        : null;

  if (Object.keys(row).length === 0) return;

  const supabase = getBrowserClient();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { error } = await supabase.from("users").update(row).eq("id", userId);
      if (error) throw error;
      return; // success
    } catch (err) {
      // A unique-violation on `username` will never succeed on retry — surface
      // it immediately so the UI can prompt for a different username.
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code?: string }).code === UNIQUE_VIOLATION &&
        row.username !== undefined
      ) {
        throw new UsernameTakenError();
      }
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
