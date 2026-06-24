import type { UserRole } from "../types";

/**
 * G-20 ROLE AUTHORITY — the single source of truth for a user's role is the
 * `public.users.role` column.
 *
 * This resolver takes ONLY the DB profile row as input. `user_metadata.mode`
 * is deliberately NOT a parameter: a metadata-only "trainer" value can never
 * promote a user, which closes the v1 self-promotion gap. Anything that gates
 * trainer features must derive role from here.
 */
export function roleFromProfileRow(
  row: { role?: string | null } | null | undefined,
): UserRole {
  return row?.role === "trainer" ? "trainer" : "client";
}
