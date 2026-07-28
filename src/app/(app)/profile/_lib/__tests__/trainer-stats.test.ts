import { describe, expect, it } from "vitest";

import { buildProfileTrainerStats } from "../trainer-stats";
import type { TrainerEarnings, TrainerPaymentTotals } from "@/features/payments";

function totals(overrides: Partial<TrainerPaymentTotals> = {}): TrainerPaymentTotals {
  return {
    currency: "NZD",
    excludedCurrencies: [],
    outstandingAmount: 300,
    outstandingSessions: 4,
    clientsWithOutstanding: 2,
    totalPaid: 200,
    completedSessions: 13,
    paidSessions: 9,
    activeClients: 3,
    ...overrides,
  };
}

function earnings(overrides: Partial<TrainerEarnings> = {}): TrainerEarnings {
  return {
    currency: "NZD",
    excludedCurrencies: [],
    total: 1300,
    week: 150,
    month: 650,
    ...overrides,
  };
}

describe("buildProfileTrainerStats", () => {
  it("maps the aggregate onto the profile stat shape", () => {
    const stats = buildProfileTrainerStats({
      totals: totals(),
      earnings: earnings(),
      activeClients: 4,
    });

    expect(stats.totalEarnings).toBe(1300);
    expect(stats.weekEarnings).toBe(150);
    expect(stats.monthEarnings).toBe(650);
    expect(stats.totalSessions).toBe(13);
    expect(stats.totalPaidSessions).toBe(9);
    expect(stats.totalUnpaidSessions).toBe(4);
    expect(stats.outstandingAmount).toBe(300);
    expect(stats.activeClients).toBe(4);
    // 9 / 13 = 69.2%
    expect(stats.collectionRate).toBe(69);
    // 1300 / 13
    expect(stats.avgPerSession).toBe("100");
    // 1300 / 4
    expect(stats.revenuePerClient).toBe(325);
  });

  it("is 0-safe with no sessions and no clients", () => {
    const stats = buildProfileTrainerStats({
      totals: totals({
        completedSessions: 0,
        paidSessions: 0,
        outstandingSessions: 0,
        outstandingAmount: 0,
        totalPaid: 0,
      }),
      earnings: earnings({ total: 0, week: 0, month: 0 }),
      activeClients: 0,
    });

    expect(stats.collectionRate).toBe(100);
    expect(stats.avgPerSession).toBe("0");
    expect(stats.revenuePerClient).toBe(0);
    expect(Number.isFinite(stats.revenuePerClient)).toBe(true);
  });

  it("never reports a collection rate above 100%", () => {
    const stats = buildProfileTrainerStats({
      totals: totals({ completedSessions: 4, paidSessions: 10 }),
      earnings: earnings(),
      activeClients: 1,
    });

    expect(stats.collectionRate).toBe(100);
  });

  it("keeps still-missing seams neutral rather than inventing numbers", () => {
    const stats = buildProfileTrainerStats({
      totals: totals(),
      earnings: earnings(),
      activeClients: 3,
    });

    expect(stats.avgSessionsPerWeek).toBe("0");
    expect(stats.monthlyGrowth).toBe(0);
    expect(stats.busiestDay).toBeNull();
    expect(stats.bestClient).toEqual({ name: "—", revenue: 0, sessions: 0 });
  });
});
