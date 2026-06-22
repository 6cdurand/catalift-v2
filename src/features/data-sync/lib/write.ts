import type { StoreApi } from "zustand/vanilla";

import { captureException } from "@/lib/sentry";
import type { SyncResult } from "../types";
import { SyncError } from "./sync-error";
import { withRetry, type WithRetryOptions } from "./with-retry";
import type { OfflineQueueState } from "./offline-queue";

export interface PersistOp<P = unknown> {
  /** Operation name, e.g. "workout:create". */
  name: string;
  /** Serializable payload used to replay the write if it is queued offline. */
  payload?: P;
}

export interface PersistOptions {
  /** Offline queue to enqueue into on terminal failure. */
  queue?: StoreApi<OfflineQueueState>;
  /** Retry tuning (operation is taken from `op.name`). */
  retry?: Omit<WithRetryOptions, "operation">;
}

/**
 * The single chokepoint for every domain write. Awaits the executor with retry;
 * on terminal failure it reports once to Sentry, enqueues the write for offline
 * replay, and returns a typed error. Never throws and never fire-and-forgets —
 * callers always get a `SyncResult` to surface to the user. Domain-agnostic: no
 * table-specific logic lives here.
 */
export async function persist<T, P = unknown>(
  op: PersistOp<P>,
  executor: () => Promise<T>,
  options: PersistOptions = {},
): Promise<SyncResult<T>> {
  try {
    const data = await withRetry(executor, {
      ...options.retry,
      operation: op.name,
    });
    return { ok: true, data };
  } catch (cause) {
    const error =
      cause instanceof SyncError
        ? cause
        : new SyncError({ operation: op.name, cause, attempts: 1 });

    // Log to Sentry exactly once, here at the boundary.
    captureException(error, { operation: op.name });

    // Persist for offline replay so the write is never silently dropped.
    options.queue?.getState().enqueue(op.name, op.payload);

    return { ok: false, error };
  }
}
