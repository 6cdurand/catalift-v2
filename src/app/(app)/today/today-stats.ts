// Today-specific glue: pure, read-only stats derived from the SAME workout
// history the rest of v2 reads (features/workout-engine fetch-history). This is
// NOT a new 1RM/PB calc — it only counts sessions / sums volume+sets / measures
// the weekly streak (the v1 Today stats row). Week boundaries come from date-fns
// (Monday-start, matching v1) so NO weekday-arithmetic / day-index math lives here.

import {
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  subWeeks,
} from "date-fns";
import type { WorkoutHistoryItem } from "@/features/workout-engine/api/fetch-history";

export interface TodayStats {
  /** Consecutive calendar weeks (Mon–Sun) ending this week with ≥1 workout. */
  weekStreak: number;
  /** Completed sessions in the current calendar week. */
  sessionsThisWeek: number;
  /** Summed total_volume across this week's sessions. */
  volumeThisWeek: number;
  /** Summed completed sets across this week's sessions. */
  setsThisWeek: number;
}

const WEEK_OPTS = { weekStartsOn: 1 as const }; // Monday, matching v1 Today.

function weekIntervalFor(date: Date) {
  return {
    start: startOfWeek(date, WEEK_OPTS),
    end: endOfWeek(date, WEEK_OPTS),
  };
}

/**
 * Number of consecutive weeks (walking back from `now`'s week) that contain at
 * least one completed workout. The current week counts only if it has one —
 * mirrors v1's `calculateStreak`. Pure; caps the look-back at 100 weeks.
 */
export function computeWeekStreak(items: WorkoutHistoryItem[], now: Date): number {
  if (items.length === 0) return 0;
  const dates = items.map((i) => new Date(i.performedAt));

  let streak = 0;
  for (let i = 0; i < 100; i++) {
    const interval = weekIntervalFor(subWeeks(now, i));
    const hasWorkout = dates.some((d) => isWithinInterval(d, interval));
    if (hasWorkout) streak++;
    else break; // a gap ends the streak
  }
  return streak;
}

/**
 * Full Today stats row from raw workout history + a reference `now`.
 * Pure and deterministic — the hook fetches, this computes.
 */
export function computeTodayStats(
  items: WorkoutHistoryItem[],
  now: Date,
): TodayStats {
  const interval = weekIntervalFor(now);
  const thisWeek = items.filter((i) =>
    isWithinInterval(new Date(i.performedAt), interval),
  );

  return {
    weekStreak: computeWeekStreak(items, now),
    sessionsThisWeek: thisWeek.length,
    volumeThisWeek: thisWeek.reduce((sum, i) => sum + (i.totalVolume || 0), 0),
    setsThisWeek: thisWeek.reduce((sum, i) => sum + (i.totalSets || 0), 0),
  };
}

/** Compact volume label (e.g. 12500 → "13k"), matching v1's Today display. */
export function formatVolume(volume: number): string {
  return volume > 1000 ? `${(volume / 1000).toFixed(0)}k` : String(volume);
}
