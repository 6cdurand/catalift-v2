/**
 * Typed error thrown when a sync operation fails after exhausting retries.
 * Carries enough context to report once at the boundary and to replay the write.
 */
export interface SyncErrorInit {
  /** Operation name, e.g. "workout:create". */
  operation: string;
  /** The underlying error that caused the failure. */
  cause: unknown;
  /** Number of attempts made before giving up. */
  attempts: number;
}

export class SyncError extends Error {
  readonly operation: string;
  readonly attempts: number;

  constructor({ operation, cause, attempts }: SyncErrorInit) {
    super(
      `Sync operation "${operation}" failed after ${attempts} attempt(s): ${describeCause(cause)}`,
      { cause },
    );
    this.name = "SyncError";
    this.operation = operation;
    this.attempts = attempts;
    // Restore the prototype chain (TS target < ES2015 class semantics).
    Object.setPrototypeOf(this, SyncError.prototype);
  }
}

function describeCause(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  if (typeof cause === "string") return cause;
  return JSON.stringify(cause);
}
