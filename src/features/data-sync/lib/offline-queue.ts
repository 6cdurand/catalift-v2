import { createStore, type StoreApi } from "zustand/vanilla";
import { persist, createJSONStorage } from "zustand/middleware";

import { userScopedKey } from "@/utils/user-scoped-key";
import type { QueuedWrite } from "../types";

/** Replays a single queued write. Rejects to signal the write should stay queued. */
export type QueueExecutor = (write: QueuedWrite) => Promise<void>;

export interface DrainResult {
  /** Writes successfully replayed and removed from the queue. */
  drained: number;
  /** Writes that failed again and remain queued (attempts incremented). */
  failed: number;
  /** Total writes still queued after draining. */
  remaining: number;
}

export interface OfflineQueueState {
  items: QueuedWrite[];
  /** Append a write to the back of the FIFO queue. */
  enqueue: (op: string, payload: unknown) => QueuedWrite;
  /** Replay queued writes in FIFO order; failures stay queued with attempts++. */
  drain: (executor: QueueExecutor) => Promise<DrainResult>;
  /** Number of writes currently queued. */
  pending: () => number;
}

function newId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ?? `q-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Builds a user-scoped, Zustand-persisted FIFO offline write queue. The persist
 * key is `userScopedKey('data-sync:offline-queue', userId)` so queues never leak
 * across accounts. Use {@link registerOnlineDrain} to drain on reconnect.
 */
export function createOfflineQueue(
  userId: string,
): StoreApi<OfflineQueueState> {
  return createStore<OfflineQueueState>()(
    persist(
      (set, get) => ({
        items: [],

        enqueue: (op, payload) => {
          const write: QueuedWrite = {
            id: newId(),
            op,
            payload,
            attempts: 0,
            createdAt: Date.now(),
          };
          set({ items: [...get().items, write] });
          return write;
        },

        drain: async (executor) => {
          const snapshot = [...get().items];
          const drainedIds = new Set<string>();
          const failedAttempts = new Map<string, number>();

          for (const write of snapshot) {
            try {
              await executor(write);
              drainedIds.add(write.id);
            } catch {
              failedAttempts.set(write.id, write.attempts + 1);
            }
          }

          // Recompute against the live list so writes enqueued mid-drain survive.
          set({
            items: get()
              .items.filter((w) => !drainedIds.has(w.id))
              .map((w) => {
                const attempts = failedAttempts.get(w.id);
                return attempts === undefined ? w : { ...w, attempts };
              }),
          });

          return {
            drained: drainedIds.size,
            failed: failedAttempts.size,
            remaining: get().items.length,
          };
        },

        pending: () => get().items.length,
      }),
      {
        name: userScopedKey("data-sync:offline-queue", userId),
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ items: state.items }),
      },
    ),
  );
}

/**
 * Drains the queue whenever the browser regains connectivity. Returns a cleanup
 * function. No-op on the server. `drain` never rejects, so the listener is safe.
 */
export function registerOnlineDrain(
  store: StoreApi<OfflineQueueState>,
  executor: QueueExecutor,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => {
    void store.getState().drain(executor);
  };
  window.addEventListener("online", handler);
  return () => window.removeEventListener("online", handler);
}
