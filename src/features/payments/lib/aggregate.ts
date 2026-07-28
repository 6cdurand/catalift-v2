// Roster-wide payment roll-up. PURE — no fetching, no React, no Supabase.
//
// CONSISTENCY LAW: every per-client figure here is produced by the SAME F2
// primitives the client file (UI-A / `useClientPayments`) uses —
// `getDisplayedSessionCount`, `getDisplayedPaidCount`, `getOutstanding` — fed
// with the same offsets. The tracker never recomputes counts locally, so
// `/payments` and `/clients/[id]` can never disagree.

import {
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import {
  getDisplayedPaidCount,
  getDisplayedSessionCount,
  getOutstanding,
} from "./derive";
import type {
  ClientPayment,
  ClientSession,
  TrainerClientBilling,
} from "../types";

/** Same fallback the client file uses when a client has no payment rows yet. */
export const FALLBACK_CURRENCY = "NZD";

export interface TrainerPaymentRow {
  clientId: string;
  name: string;
  avatarUrl: string | null;
  status: string;
  pricePerSession: number | null;
  /** Newest payment's currency, else the fallback — identical to UI-A. */
  currency: string;
  completedSessions: number;
  paidSessions: number;
  outstandingSessions: number;
  outstandingAmount: number | null;
  hasOutstanding: boolean;
  /** Sum of this client's `client_payments.amount` (their own currency). */
  paidAmount: number;
  /** This client's payments, newest first (same order as `fetchClientPayments`). */
  payments: ClientPayment[];
}

export interface TrainerPaymentTotals {
  /** The dominant currency all money totals are expressed in. */
  currency: string;
  /** Currencies present on the roster but excluded from the money totals. */
  excludedCurrencies: string[];
  outstandingAmount: number;
  outstandingSessions: number;
  clientsWithOutstanding: number;
  totalPaid: number;
  completedSessions: number;
  paidSessions: number;
  activeClients: number;
}

export interface TrainerPaymentsAggregate {
  rows: TrainerPaymentRow[];
  totals: TrainerPaymentTotals;
}

export interface TrainerEarnings {
  currency: string;
  excludedCurrencies: string[];
  total: number;
  week: number;
  month: number;
}

/**
 * The currency most of this trainer's payments are in. Ties break on the larger
 * summed amount, then alphabetically, so the result is deterministic.
 */
export function dominantCurrency(payments: ClientPayment[]): string {
  if (payments.length === 0) return FALLBACK_CURRENCY;

  const stats = new Map<string, { count: number; amount: number }>();
  for (const p of payments) {
    const current = stats.get(p.currency) ?? { count: 0, amount: 0 };
    current.count += 1;
    current.amount += p.amount;
    stats.set(p.currency, current);
  }

  return [...stats.entries()].sort((a, b) => {
    if (b[1].count !== a[1].count) return b[1].count - a[1].count;
    if (b[1].amount !== a[1].amount) return b[1].amount - a[1].amount;
    return a[0].localeCompare(b[0]);
  })[0][0];
}

function excludedCurrenciesOf(
  payments: ClientPayment[],
  currency: string,
): string[] {
  return [
    ...new Set(payments.map((p) => p.currency).filter((c) => c !== currency)),
  ].sort();
}

/**
 * Rows + roster-wide totals for the payment tracker.
 *
 * Sort order: clients with outstanding first (largest outstanding money first,
 * rows without a rate ranked by outstanding session count after them), then
 * alphabetically by name.
 */
export function buildTrainerPaymentRows(
  billing: TrainerClientBilling[],
  sessions: ClientSession[],
  payments: ClientPayment[],
): TrainerPaymentsAggregate {
  const currency = dominantCurrency(payments);

  const rows: TrainerPaymentRow[] = billing.map((b) => {
    const sessionsForClient = sessions.filter(
      (s) => s.clientId === b.clientId,
    );
    const paymentsForClient = payments.filter((p) => p.clientId === b.clientId);

    const completed = getDisplayedSessionCount(
      b.historicalOffsetSessions,
      sessionsForClient,
    );
    const paid = getDisplayedPaidCount(b.totalPaidOffset, paymentsForClient);
    const { outstandingSessions, outstandingAmount, hasOutstanding } =
      getOutstanding(completed, paid, b.pricePerSession ?? undefined);

    return {
      clientId: b.clientId,
      name: b.name,
      avatarUrl: b.avatarUrl,
      status: b.status,
      pricePerSession: b.pricePerSession,
      currency: paymentsForClient[0]?.currency ?? FALLBACK_CURRENCY,
      completedSessions: completed,
      paidSessions: paid,
      outstandingSessions,
      outstandingAmount,
      hasOutstanding,
      paidAmount: paymentsForClient.reduce((sum, p) => sum + p.amount, 0),
      payments: paymentsForClient,
    };
  });

  rows.sort((a, b) => {
    if (a.hasOutstanding !== b.hasOutstanding) return a.hasOutstanding ? -1 : 1;
    if (a.hasOutstanding) {
      const amountDiff = (b.outstandingAmount ?? -1) - (a.outstandingAmount ?? -1);
      if (amountDiff !== 0) return amountDiff;
      if (b.outstandingSessions !== a.outstandingSessions) {
        return b.outstandingSessions - a.outstandingSessions;
      }
    }
    return a.name.localeCompare(b.name);
  });

  // Money totals stay inside ONE currency. A client with no payments yet has no
  // currency of their own, so their outstanding counts toward the dominant one.
  const inDominantCurrency = (row: TrainerPaymentRow) =>
    row.payments.length === 0 || row.currency === currency;

  const totals: TrainerPaymentTotals = {
    currency,
    excludedCurrencies: excludedCurrenciesOf(payments, currency),
    outstandingAmount: rows
      .filter(inDominantCurrency)
      .reduce((sum, r) => sum + (r.outstandingAmount ?? 0), 0),
    outstandingSessions: rows.reduce(
      (sum, r) => sum + r.outstandingSessions,
      0,
    ),
    clientsWithOutstanding: rows.filter((r) => r.hasOutstanding).length,
    totalPaid: payments
      .filter((p) => p.currency === currency)
      .reduce((sum, p) => sum + p.amount, 0),
    completedSessions: rows.reduce((sum, r) => sum + r.completedSessions, 0),
    paidSessions: rows.reduce((sum, r) => sum + r.paidSessions, 0),
    activeClients: rows.filter((r) => r.status === "active").length,
  };

  return { rows, totals };
}

/** `paid_at` is the payment's real date; `created_at` is the fallback. */
function paymentDate(payment: ClientPayment): Date {
  return new Date(payment.paidAt ?? payment.createdAt);
}

/**
 * All-time / this-week / this-calendar-month earnings, in the dominant currency
 * only (mixed-currency rows are excluded, never summed across rates).
 */
export function buildTrainerEarnings(
  payments: ClientPayment[],
  now: Date = new Date(),
): TrainerEarnings {
  const currency = dominantCurrency(payments);
  const inCurrency = payments.filter((p) => p.currency === currency);

  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const sumBetween = (from: Date, to: Date) =>
    inCurrency
      .filter((p) => {
        const d = paymentDate(p);
        if (Number.isNaN(d.getTime())) return false;
        return d >= from && d <= to;
      })
      .reduce((sum, p) => sum + p.amount, 0);

  return {
    currency,
    excludedCurrencies: excludedCurrenciesOf(payments, currency),
    total: inCurrency.reduce((sum, p) => sum + p.amount, 0),
    week: sumBetween(weekStart, weekEnd),
    month: sumBetween(monthStart, monthEnd),
  };
}
