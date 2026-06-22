import type { Database } from "@/types/database";
import type { SyncError } from "./lib/sync-error";

/** Names of all public tables, for typing domain sync ops in Phase 3. */
export type TableName = keyof Database["public"]["Tables"];

/** Row type for a given public table. */
export type TableRow<T extends TableName> =
  Database["public"]["Tables"][T]["Row"];

/** Lifecycle of a sync-aware resource. */
export type SyncStatus = "idle" | "syncing" | "synced" | "pending" | "error";

/** Discriminated result of a persisted write. Never throws past the boundary. */
export type SyncResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: SyncError };

/** A write awaiting replay in the offline queue. */
export interface QueuedWrite<P = unknown> {
  /** Stable id for dedupe/removal. */
  id: string;
  /** Operation name, e.g. "workout:create". */
  op: string;
  /** Serializable payload used to replay the write. */
  payload: P;
  /** Number of replay attempts already made. */
  attempts: number;
  /** Epoch ms when first enqueued. */
  createdAt: number;
}
