import * as Sentry from "@sentry/nextjs";

/**
 * Error reporting boundary. Forwards to Sentry.captureException with
 * optional context. Call this exactly once per failure, at the boundary
 * where the error is handled (e.g. data-sync/lib/write.ts), to avoid
 * duplicate reports. Callers must still surface a user-facing error
 * separately — this does NOT replace user-facing error UI.
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  Sentry.captureException(error, { extra: context });
}
