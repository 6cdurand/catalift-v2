"use client";

/**
 * Progress tab — a PARTIAL of inventory row 28 (Full Workout History,
 * `v1: src/app/clients/[id]/page.tsx:2189-2292`).
 *
 * This lists the workout history the page ALREADY fetches
 * (`fetchWorkoutHistory(clientId, 10)`), as a plain dated list. It is here
 * because a tab that ships as a "coming soon" card is the stub pattern this port
 * exists to kill, and the data was already in hand.
 *
 * **Lane L5 replaces this wholesale** with v1's scrollable "All Workouts (n)":
 * PT-session and has-notes tags, exercise count, duration, and the Repeat /
 * Save-as-Template / Edit actions. Rows 27 (categories split), 29 (circuit
 * history) and 30 (charts) stay MISSING for L5 too — no chart and no invented
 * data here.
 */

import { EmptyState } from "@/components/states";
import { Dumbbell } from "lucide-react";
import type { WorkoutHistoryItem } from "@/features/workout-engine/api/fetch-history";
import { formatDate, formatVolume } from "../_lib/format";

export function ProgressPanel({
  history,
  onOpenWorkout,
}: {
  history: WorkoutHistoryItem[];
  onOpenWorkout: (workoutId: string) => void;
}) {
  if (history.length === 0) {
    return (
      <EmptyState
        icon={<Dumbbell />}
        title="No workouts yet"
        description="Completed workouts will appear here once this client trains."
      />
    );
  }

  return (
    <div data-testid="progress-workout-history">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Workout History
      </h2>
      <div className="space-y-2">
        {history.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpenWorkout(item.id)}
            className="w-full text-left rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {item.name || "Workout"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatDate(item.performedAt)}
                </p>
              </div>
              <p className="text-sm font-semibold text-gray-900 shrink-0">
                {formatVolume(item.totalVolume)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
