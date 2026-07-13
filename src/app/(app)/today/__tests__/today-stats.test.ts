import { describe, it, expect } from "vitest";
import type { WorkoutHistoryItem } from "@/features/workout-engine/api/fetch-history";
import {
  computeTodayStats,
  computeWeekStreak,
  formatVolume,
} from "../today-stats";

// Reference "now": Monday 2026-07-13 (the F2 dispatch date). Its Mon–Sun week is
// 2026-07-13 … 2026-07-19.
const NOW = new Date("2026-07-13T12:00:00");

function item(
  performedAt: string,
  overrides: Partial<WorkoutHistoryItem> = {},
): WorkoutHistoryItem {
  return {
    id: `w-${performedAt}`,
    name: "Session",
    performedAt,
    totalVolume: 1000,
    totalSets: 12,
    ...overrides,
  };
}

describe("computeTodayStats", () => {
  it("returns zeros for an empty history", () => {
    const stats = computeTodayStats([], NOW);
    expect(stats).toEqual({
      weekStreak: 0,
      sessionsThisWeek: 0,
      volumeThisWeek: 0,
      setsThisWeek: 0,
    });
  });

  it("counts sessions / volume / sets within the current calendar week only", () => {
    const items = [
      item("2026-07-13T08:00:00", { totalVolume: 2000, totalSets: 10 }), // Mon (in)
      item("2026-07-15T18:00:00", { totalVolume: 3000, totalSets: 14 }), // Wed (in)
      item("2026-07-19T09:00:00", { totalVolume: 1000, totalSets: 6 }), // Sun (in)
      item("2026-07-12T09:00:00", { totalVolume: 9999, totalSets: 99 }), // prev Sun (out)
      item("2026-07-20T09:00:00", { totalVolume: 8888, totalSets: 88 }), // next Mon (out)
    ];
    const stats = computeTodayStats(items, NOW);
    expect(stats.sessionsThisWeek).toBe(3);
    expect(stats.volumeThisWeek).toBe(6000);
    expect(stats.setsThisWeek).toBe(30);
  });
});

describe("computeWeekStreak", () => {
  it("is 0 when the current week has no workout", () => {
    // Only last week has a workout → current week gap ends the streak at 0.
    const items = [item("2026-07-06T09:00:00")];
    expect(computeWeekStreak(items, NOW)).toBe(0);
  });

  it("counts consecutive weeks back from the current week", () => {
    const items = [
      item("2026-07-14T09:00:00"), // this week
      item("2026-07-07T09:00:00"), // last week
      item("2026-06-30T09:00:00"), // two weeks ago
      // gap: no workout the week of 2026-06-22
      item("2026-06-16T09:00:00"), // four weeks ago (not counted — gap breaks it)
    ];
    expect(computeWeekStreak(items, NOW)).toBe(3);
  });
});

describe("formatVolume", () => {
  it("compacts thousands and leaves small values as-is", () => {
    expect(formatVolume(500)).toBe("500");
    expect(formatVolume(12500)).toBe("13k");
    expect(formatVolume(0)).toBe("0");
  });
});
