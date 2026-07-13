"use client";

// Today stats hook — fetches the signed-in user's completed workouts (the SAME
// read API the history/PB surfaces use) and derives the Today stats row via the
// pure `computeTodayStats`. Read-only: no writes, no schema, no next-day math.

import { useEffect, useState } from "react";
import {
  fetchWorkoutHistory,
  type WorkoutHistoryItem,
} from "@/features/workout-engine/api/fetch-history";
import { computeTodayStats, type TodayStats } from "./today-stats";

const EMPTY_STATS: TodayStats = {
  weekStreak: 0,
  sessionsThisWeek: 0,
  volumeThisWeek: 0,
  setsThisWeek: 0,
};

export interface UseTodayStatsResult {
  stats: TodayStats;
  isLoading: boolean;
  error: Error | null;
}

export function useTodayStats(
  userId: string | null | undefined,
  sessionLoading: boolean,
): UseTodayStatsResult {
  const [state, setState] = useState<UseTodayStatsResult>({
    stats: EMPTY_STATS,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    if (sessionLoading) return;

    let cancelled = false;

    async function load() {
      if (!userId) {
        if (!cancelled) {
          setState({ stats: EMPTY_STATS, isLoading: false, error: null });
        }
        return;
      }
      try {
        // Pull enough history to cover the streak look-back window.
        const items: WorkoutHistoryItem[] = await fetchWorkoutHistory(userId, 200);
        if (cancelled) return;
        const stats = computeTodayStats(items, new Date());
        setState({ stats, isLoading: false, error: null });
      } catch (err) {
        if (!cancelled) {
          setState({ stats: EMPTY_STATS, isLoading: false, error: err as Error });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, sessionLoading]);

  return state;
}
