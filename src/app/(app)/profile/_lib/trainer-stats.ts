// Profile trainer stats — a PURE mapping from the F2 roster-wide aggregate
// (`buildTrainerPaymentRows` totals + `buildTrainerEarnings`) onto the shape the
// verbatim v1 profile JSX already renders. No fetching, no recomputation: every
// payment-derived figure comes from the same primitives `/payments` and
// `/clients/[id]` use, so the three surfaces can never disagree.

import type { TrainerEarnings, TrainerPaymentTotals } from "@/features/payments";

export interface ProfileTrainerStats {
  totalSessions: number;
  weekSessions: number;
  monthSessions: number;
  totalEarnings: number;
  weekEarnings: number;
  monthEarnings: number;
  activeClients: number;
  avgSessionsPerWeek: string;
  avgPerSession: string;
  outstandingAmount: number;
  totalPaidSessions: number;
  totalUnpaidSessions: number;
  collectionRate: number;
  bestClient: { name: string; revenue: number; sessions: number };
  busiestDay: { day: string; count: number } | null;
  monthlyGrowth: number;
  totalClientsEver: number;
  revenuePerClient: number;
}

export function buildProfileTrainerStats({
  totals,
  earnings,
  activeClients,
}: {
  totals: TrainerPaymentTotals;
  earnings: TrainerEarnings;
  /** The roster count the profile already shows (active connections). */
  activeClients: number;
}): ProfileTrainerStats {
  const completed = totals.completedSessions;

  // paid > completed means everything billed has been collected — cap at 100%
  // rather than reporting a >100% rate.
  const collectionRate =
    completed === 0
      ? 100
      : Math.min(100, Math.round((totals.paidSessions / completed) * 100));

  return {
    totalSessions: completed,
    // Session-date windows are not part of the payment roll-up; these two are
    // unrendered placeholders, kept at 0 rather than showing a fake non-zero.
    weekSessions: 0,
    monthSessions: 0,
    totalEarnings: earnings.total,
    weekEarnings: earnings.week,
    monthEarnings: earnings.month,
    activeClients,
    // Needs a "first session ever" seam that still does not exist.
    avgSessionsPerWeek: "0",
    avgPerSession:
      completed === 0 ? "0" : String(Math.round(earnings.total / completed)),
    outstandingAmount: totals.outstandingAmount,
    totalPaidSessions: totals.paidSessions,
    totalUnpaidSessions: totals.outstandingSessions,
    collectionRate,
    // Deferred seams — shown as neutral, never as invented numbers.
    bestClient: { name: "—", revenue: 0, sessions: 0 },
    busiestDay: null,
    monthlyGrowth: 0,
    totalClientsEver: activeClients,
    revenuePerClient:
      activeClients === 0 ? 0 : Math.round(earnings.total / activeClients),
  };
}
