import { SyncError } from "./sync-error";

export interface WithRetryOptions {
  /** Total attempts before failing. Default 3. */
  retries?: number;
  /** Base backoff in ms; doubles each attempt. Default 300. */
  baseMs?: number;
  /** Operation name carried into the thrown SyncError. */
  operation?: string;
  /** Optional hook fired before each backoff delay. */
  onRetry?: (attempt: number, error: unknown) => void;
}

const DEFAULT_RETRIES = 3;
const DEFAULT_BASE_MS = 300;

/**
 * Runs `fn`, retrying with exponential backoff on rejection. On final failure
 * rethrows a typed {@link SyncError} carrying the operation, cause and attempt
 * count. Never swallows the error — the boundary decides how to surface it.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: WithRetryOptions = {},
): Promise<T> {
  const {
    retries = DEFAULT_RETRIES,
    baseMs = DEFAULT_BASE_MS,
    operation = "unknown",
    onRetry,
  } = options;

  const attempts = Math.max(1, retries);
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt >= attempts) break;
      onRetry?.(attempt, err);
      await delay(baseMs * 2 ** (attempt - 1));
    }
  }

  throw new SyncError({ operation, cause: lastError, attempts });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
