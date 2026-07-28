"use client";

// The rich /today surface (F2). Composition, not new design: it REUSES the w3
// client-program components (WeeklyProgressStrip + UpNextCard) so "Up Next" comes
// ONLY from getNextProgramWorkout (parity law — BUG-001/010). Presentational:
// all data + handlers arrive via props; this file contains NO next-day / rotation
// / day-index math, and NO calendar-date arithmetic (the week's dates arrive as
// `weekDays`, computed by the shared @/lib/week helpers).
//
// Phase 1b (Christo 2026-07-29): the athlete gets the SAME day strip as the
// trainer. When the selected day IS today the surface renders exactly as before.
// When it is any other day (past OR future) it shows that day's session(s) with
// a Start button, which the page puts behind the "Start Workout Today?" confirm.
//
// Session rows are rendered GENERICALLY from ScheduledSession — no `kind` is
// hard-coded — so booking-kind rows slot in when the booking lane lands.

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, History, Dumbbell, PencilRuler, Play } from "lucide-react";
import type { ClientProgram, NextWorkoutResult } from "@/features/programs";
import { getSessionsForDate, type ScheduledSession } from "@/features/calendar";
import { UpNextCard } from "@/features/programs/client/components/UpNextCard";
import { WeeklyProgressStrip } from "@/features/programs/client/components/WeeklyProgressStrip";
import { formatMonthDay, formatWeekdayLong } from "@/lib/week";
import { DayStrip } from "./DayStrip";
import { TodayStatsRow } from "./TodayStatsRow";
import type { TodayStats } from "./today-stats";

const STATUS_COLOR: Record<string, string> = {
  done: "border-green-200 bg-green-50 text-green-700",
  upcoming: "border-blue-200 bg-blue-50 text-blue-700",
  missed: "border-red-200 bg-red-50 text-red-600",
  rest: "border-gray-200 bg-gray-50 text-gray-500",
};

/**
 * A row is startable when it maps to a real program day that has not already
 * been completed. Deliberately kind-agnostic: a future booking row with a
 * dayIndex behaves the same. `dayIndex` is READ, never computed (parity law).
 */
function isStartable(session: ScheduledSession): boolean {
  return session.dayIndex >= 0 && session.status !== "done";
}

function SessionCard({
  session,
  onStart,
}: {
  session: ScheduledSession;
  /** Omitted on today's rows — today keeps its existing (button-less) layout. */
  onStart?: (session: ScheduledSession) => void;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${STATUS_COLOR[session.status] ?? ""}`}
      data-testid="today-session-card"
    >
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
      {onStart && isStartable(session) && (
        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            className="h-8 bg-sky-500 hover:bg-sky-600 text-white"
            aria-label={`Start ${session.label}`}
            onClick={() => onStart(session)}
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />
            Start
          </Button>
        </div>
      )}
    </div>
  );
}

function QuickStart({
  onStartWorkout,
  onViewHistory,
  onBuildWorkout,
}: {
  onStartWorkout: () => void;
  onViewHistory: () => void;
  onBuildWorkout: () => void;
}) {
  return (
    <div className="space-y-3">
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
      <Button
        variant="outline"
        className="w-full h-auto py-3 bg-white border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-2 rounded-2xl text-gray-700"
        onClick={onBuildWorkout}
      >
        <PencilRuler className="w-5 h-5 text-sky-500" />
        <span className="font-semibold text-sm">Build Workout</span>
      </Button>
    </div>
  );
}

export interface TodaySurfaceProps {
  activeProgram: ClientProgram | null;
  next: NextWorkoutResult | null;
  completedDayIndices: number[];
  stats: TodayStats;
  /** Every session in the VISIBLE WEEK (Mon→Sun), from useScheduledSessions. */
  sessions: ScheduledSession[];
  /** The 7 ISO dates of the visible week, Mon→Sun (from @/lib/week). */
  weekDays: string[];
  /** ISO YYYY-MM-DD currently selected. */
  selectedDate: string;
  /** ISO YYYY-MM-DD device-local today — the ONE authority for "is today". */
  today: string;
  onSelectDate: (iso: string) => void;
  onShiftWeek: (deltaWeeks: number) => void;
  onStepDay: (deltaDays: number) => void;
  onOpenCalendar: () => void;
  /** Start a specific session row (the page decides whether to confirm first). */
  onStartSession: (session: ScheduledSession) => void;
  onStartWorkout: () => void;
  onBuildWorkout: () => void;
  onPreview: (dayIndex: number) => void;
  onSwap: () => void;
  onViewHistory: () => void;
}

export function TodaySurface({
  activeProgram,
  next,
  completedDayIndices,
  stats,
  sessions,
  weekDays,
  selectedDate,
  today,
  onSelectDate,
  onShiftWeek,
  onStepDay,
  onOpenCalendar,
  onStartSession,
  onStartWorkout,
  onBuildWorkout,
  onPreview,
  onSwap,
  onViewHistory,
}: TodaySurfaceProps) {
  const isToday = selectedDate === today;

  // Dots + accessible counts for the strip. Derived with the shared calendar
  // selector over the dates the caller supplied — no date math here.
  const sessionCountsByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const iso of weekDays) {
      const count = getSessionsForDate(sessions, iso).length;
      if (count > 0) counts[iso] = count;
    }
    return counts;
  }, [sessions, weekDays]);

  const datesWithSessions = useMemo(
    () => new Set(Object.keys(sessionCountsByDate)),
    [sessionCountsByDate],
  );

  const selectedSessions = useMemo(
    () => getSessionsForDate(sessions, selectedDate),
    [sessions, selectedDate],
  );

  return (
    <div className="space-y-5">
      {/* Day selector — the SAME strip the trainer surface renders. */}
      <DayStrip
        weekDays={weekDays}
        selectedDate={selectedDate}
        today={today}
        datesWithSessions={datesWithSessions}
        sessionCountsByDate={sessionCountsByDate}
        onSelectDate={onSelectDate}
        onShiftWeek={onShiftWeek}
        onStepDay={onStepDay}
        onOpenCalendar={onOpenCalendar}
      />

      {/* Program-week progress — reuse w3 WeeklyProgressStrip (program-derived
          state only). Kept alongside the day strip: it answers "where am I in
          the program", the strip answers "which calendar day am I looking at". */}
      {activeProgram && next && (
        <WeeklyProgressStrip
          program={activeProgram}
          completedDayIndices={completedDayIndices}
          lockedDayIndices={next.lockedDayIndices}
          nextDayIndex={next.dayIndex}
        />
      )}

      {isToday ? (
        <>
          {/* Up Next — reuse w3 UpNextCard, fed from getNextProgramWorkout.
              Today-only by definition. */}
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
          <QuickStart
            onStartWorkout={onStartWorkout}
            onBuildWorkout={onBuildWorkout}
            onViewHistory={onViewHistory}
          />

          {/* Stats row — this week's sessions / streak / sets / volume. */}
          <TodayStatsRow stats={stats} />

          {/* Scheduled sessions — the original list, now ONE section (not the page).
              Heading intentionally avoids the word "Today" so it doesn't collide with
              the app-header "Today" heading in the shell e2e. */}
          <SessionList
            heading="Scheduled sessions"
            sessions={selectedSessions}
            emptyLabel="No training scheduled for today. Enjoy the recovery!"
          />
        </>
      ) : (
        /* Another day selected — that day's sessions, each startable behind the
           page's confirm. Up Next (today-only) and the stats row (this-week
           aggregate, not per-day) are intentionally hidden here, as is the
           quick-start block: its "Start Workout" starts TODAY's next day and
           would compete with the per-row Start on the day being browsed. */
        <SessionList
          heading={`Schedule — ${formatMonthDay(selectedDate)}`}
          sessions={selectedSessions}
          emptyLabel={`No training scheduled for ${formatWeekdayLong(
            selectedDate,
          )}. Enjoy the recovery!`}
          onStartSession={onStartSession}
        />
      )}
    </div>
  );
}

function SessionList({
  heading,
  sessions,
  emptyLabel,
  onStartSession,
}: {
  heading: string;
  sessions: ScheduledSession[];
  emptyLabel: string;
  onStartSession?: (session: ScheduledSession) => void;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
        <Dumbbell className="w-4 h-4" />
        {heading}
      </h2>
      {sessions.length > 0 ? (
        <div className="space-y-3">
          {sessions.map((session, i) => (
            <SessionCard
              key={`${session.date}-${i}`}
              session={session}
              onStart={onStartSession}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-sm font-medium text-gray-600">Rest Day</p>
          <p className="mt-1 text-xs text-gray-400">{emptyLabel}</p>
        </div>
      )}
    </section>
  );
}
