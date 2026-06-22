export { SyncError, type SyncErrorInit } from "./lib/sync-error";
export { withRetry, type WithRetryOptions } from "./lib/with-retry";
export { mergeById } from "./lib/hydrate-merge";
export {
  createOfflineQueue,
  registerOnlineDrain,
  type OfflineQueueState,
  type QueueExecutor,
  type DrainResult,
} from "./lib/offline-queue";
export {
  persist,
  type PersistOp,
  type PersistOptions,
} from "./lib/write";
export type {
  SyncResult,
  SyncStatus,
  QueuedWrite,
  TableName,
  TableRow,
} from "./types";
