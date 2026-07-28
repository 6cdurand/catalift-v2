import type { OutstandingResult } from "../types";

export function getDisplayedSessionCount(
  offset: number,
  sessions: { clientId: string; trainerId: string }[],
): number {
  return Math.max(0, (offset ?? 0) + sessions.length);
}

export function getDisplayedPaidCount(
  paidOffset: number,
  payments: { status: string; sessionsIncluded?: number }[],
): number {
  const sum = (payments || [])
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + (p.sessionsIncluded ?? 1), 0);
  return Math.max(0, (paidOffset ?? 0) + sum);
}

export function getOutstanding(
  completed: number,
  paid: number,
  pricePerSession?: number,
): OutstandingResult {
  const sessions = Math.max(0, completed - paid);
  return {
    outstandingSessions: sessions,
    outstandingAmount: pricePerSession ? sessions * pricePerSession : null,
    hasOutstanding: sessions >= 1,
  };
}
