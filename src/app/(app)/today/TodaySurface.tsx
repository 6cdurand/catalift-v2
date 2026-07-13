"use client";

// The rich /today surface (F2). Composition, not new design: it REUSES the w3
// client-program components (WeeklyProgressStrip + UpNextCard) so "Up Next" comes
// ONLY from getNextProgramWorkout (parity law — BUG-001/010). Presentational:
// all data + handlers arrive via props; this file contains NO next-day / rotation
// / day-index math.

import { Button } from "@/components/ui/button";
import { Plus, History, Dumbbell } from "lucide-react";
import type { ClientProgram, NextWorkoutResult } from "@/features/programs";
import type { ScheduledSession } from "@/features/calendar";
import { UpNextCard } from "@/features/programs/client/components/UpNextCard";
import { WeeklyProgressStrip } from "@/features/programs/client/components/WeeklyProgressStrip";
import { TodayStatsRow } from "./TodayStatsRow";
import type { TodayStats } from "./today-stats";

const STATUS_COLOR: Record<string, string> = {
  done: "border-green-200 bg-green-50 text-green-700",
  upcoming: "border-blue-200 bg-blue-50 text-blue-700",
  missed: "border-red-200 bg-red-50 text-red-600",
  rest: "border-gray-200 bg-gray-50 text-gray-500",
};

function SessionCard({ session }: { session: ScheduledSession }) {
  return (
    <div className={`rounded-lg border p-4 ${STATUS_COLOR[session.status] ?? ""}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{session.label}</p>
          <p className="text-xs capitalize text-muted-foreground">
            {session.kind.replace("-", " ")}
            {session.sessionType ? ` · ${session.sessionType}` : ""}
          </p>
        </div>
        <span className="text-xs font-medium uppercase">{session.status}</span>
      </div>
    </div>
  );
}

function QuickStart({
  onStartWorkout,
  onViewHistory,
}: {
  onStartWorkout: () => void;
  onViewHistory: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button
        className="h-auto py-6 bg-linear-to-br from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 flex flex-col items-center gap-2 rounded-2xl shadow-lg shadow-sky-500/20 text-white"
        onClick={onStartWorkout}
      >
        <Plus className="w-6 h-6" />
        <span className="font-bold text-sm">Start Workout</span>
      </Button>
      <Button
        variant="outline"
        className="h-auto py-6 bg-gray-50 border-gray-200 hover:bg-gray-100 flex flex-col items-center gap-2 rounded-2xl text-gray-700"
        onClick={onViewHistory}
      >
        <History className="w-6 h-6 text-gray-400" />
        <span className="font-semibold text-sm">History</span>
      </Button>
    </div>
  );
}

export interface TodaySurfaceProps {
  activeProgram: ClientProgram | null;
  next: NextWorkoutResult | null;
  completedDayIndices: number[];
  stats: TodayStats;
  todaySessions: ScheduledSession[];
  onStartWorkout: () => void;
  onPreview: (dayIndex: number) => void;
  onSwap: () => void;
  onViewHistory: () => void;
}

export function TodaySurface({
  activeProgram,
  next,
  completedDayIndices,
  stats,
  todaySessions,
  onStartWorkout,
  onPreview,
  onSwap,
  onViewHistory,
}: TodaySurfaceProps) {
  return (
    <div className="space-y-5">
      {/* Week strip — reuse w3 WeeklyProgressStrip (program-derived state only). */}
      {activeProgram && next && (
        <WeeklyProgressStrip
          program={activeProgram}
          completedDayIndices={completedDayIndices}
          lockedDayIndices={next.lockedDayIndices}
          nextDayIndex={next.dayIndex}
        />
      )}

      {/* Up Next — reuse w3 UpNextCard, fed from getNextProgramWorkout. */}
      {activeProgram && next && (
        <UpNextCard
          program={activeProgram}
          next={next}
          onStart={onStartWorkout}
          onPreview={onPreview}
          onSwap={onSwap}
        />
      )}

      {/* Quick-start — same start flow the program page uses (/workout/active). */}
      <QuickStart onStartWorkout={onStartWorkout} onViewHistory={onViewHistory} />

      {/* Stats row — this week's sessions / streak / sets / volume. */}
      <TodayStatsRow stats={stats} />

      {/* Scheduled sessions — the original list, now ONE section (not the page).
          Heading intentionally avoids the word "Today" so it doesn't collide with
          the app-header "Today" heading in the shell e2e. */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
          <Dumbbell className="w-4 h-4" />
          Scheduled sessions
        </h2>
        {todaySessions.length > 0 ? (
          <div className="space-y-3">
            {todaySessions.map((session, i) => (
              <SessionCard key={`${session.date}-${i}`} session={session} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-sm font-medium text-gray-600">Rest Day</p>
            <p className="mt-1 text-xs text-gray-400">
              No training scheduled for today. Enjoy the recovery!
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
