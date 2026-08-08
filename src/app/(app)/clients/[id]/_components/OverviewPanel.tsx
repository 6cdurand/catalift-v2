"use client";

/**
 * Overview tab.
 *
 * Holds what v2's single-scroll page already had, minus the identity block that
 * moved into the page header: the client-info strip (email, last seen, workouts
 * logged) and the Recent Workouts list — moved here unchanged from
 * `page.tsx:300-351`, which is where v1 also keeps it (v1 `:1906-2149`,
 * inventory row 26, owned by lane L5).
 *
 * The counter says **workouts**, not sessions. It is
 * `count(workouts where user_id = client)` from `fetchClients()`
 * (`roster.ts:101-121`). The only authority for the word "sessions" is
 * `historical_offset_sessions + client_sessions` (payments `derive.ts:3-8`),
 * which renders once, in the Payments tab (G-14, trainer-ops rule 2).
 *
 * Rows 14-25 (quick-stats grid, compliance ring, goals, notes, onboarding) stay
 * MISSING for lanes L2/L3.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Dumbbell } from "lucide-react";
import type { WorkoutHistoryItem } from "@/features/workout-engine/api/fetch-history";
import { formatDate, formatVolume } from "../_lib/format";

export function OverviewPanel({
  email,
  lastSeen,
  workoutCount,
  history,
  onOpenWorkout,
}: {
  email: string;
  lastSeen: string | null;
  workoutCount: number;
  history: WorkoutHistoryItem[];
  onOpenWorkout: (workoutId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardContent className="p-4">
          {email && <p className="text-xs text-gray-500 truncate">{email}</p>}

          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1" data-testid="overview-workouts-logged">
              <Dumbbell className="w-3 h-3" />
              {workoutCount} workouts logged
            </span>
            {lastSeen && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Last: {formatDate(lastSeen)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Workouts Section */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Recent Workouts
        </h2>

        {history.length === 0 ? (
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="py-8 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">No workouts recorded yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <div
                key={item.id}
                onClick={() => onOpenWorkout(item.id)}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {item.name || "Workout"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDate(item.performedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-right shrink-0">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatVolume(item.totalVolume)}
                      </p>
                      <p className="text-[10px] uppercase text-gray-400">Volume</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {item.totalSets}
                      </p>
                      <p className="text-[10px] uppercase text-gray-400">Sets</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
