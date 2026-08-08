/**
 * `trainer_clients.status` presentation.
 *
 * The live CHECK constraint is
 * `status = ANY (ARRAY['active','inactive','pending','archived'])`. v2 rendered
 * a binary Active/Inactive badge, so `pending` and `archived` links both read
 * as "Inactive" — a trainer could not tell an invited client from a dropped one.
 *
 * v1's badge (`v1: src/app/clients/[id]/page.tsx:657-669`) is also a
 * WRITE control that flips `active ⇄ paused`. That is NOT ported: `paused` is
 * not an allowed value, and the `trainer_clients_guard_activate` trigger
 * (`00012_harden_trainer_client_authz.sql:91-121`) lets only the CLIENT move a
 * link into `active` — so a trainer who deactivated a client could never undo
 * it. See inventory row 6 / blocker B16. The badge stays read-only.
 */

export const CLIENT_STATUSES = [
  "active",
  "inactive",
  "pending",
  "archived",
] as const;

export type ClientStatus = (typeof CLIENT_STATUSES)[number];

const LABELS: Record<ClientStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  pending: "Pending",
  archived: "Archived",
};

/** Human label for a status. Unknown values fall through verbatim (as v1 does). */
export function statusLabel(status: string): string {
  return LABELS[status as ClientStatus] ?? status;
}

/**
 * v1 shows "Pending Signup" when a `trainer_clients` row has no matching user
 * record (`isPlaceholder`). v2 has no placeholder rows — the equivalent state is
 * an invited-but-not-yet-accepted link, i.e. `status = 'pending'`.
 */
export function isPendingSignup(status: string): boolean {
  return status === "pending";
}
