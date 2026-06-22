// Sentry will be initialized here when DSN is configured.
// Export placeholder for now.
export function initSentry() {
  // TODO: Initialize Sentry when SENTRY_DSN is set
}

/**
 * Error reporting boundary. Until the Sentry SDK/DSN is wired up this forwards
 * to `console.error` so failures are never silently dropped — callers must
 * still surface a user-facing error separately (no silent failures).
 *
 * Call this exactly once per failure, at the boundary where the error is
 * handled (e.g. `data-sync/lib/write.ts`), to avoid duplicate reports.
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  // TODO: forward to Sentry.captureException(error, { extra: context }) once wired.
  console.error("[sentry] captureException", error, context ?? {});
}
