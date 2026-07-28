"use client";

// Trainer Today surface — a daily SCHEDULE view, nothing else.
//
// Christo 2026-07-28: "Active clients and details like that should only show in
// the Clients page, not the Today page." The roster stats grid, the top-5 client
// list and the Recent Client Completions section were DELETED from this surface;
// they live on /clients. What remains is Quick Actions → day strip → the
// selected day's client sessions → the workout-builder link.
//
// Composition only. The schedule data comes from useTrainerWeekSchedule, which
// reuses the shared pure selectors, so the parity law still holds: this file
// contains NO day-index / next-day arithmetic (grep-guard enforced).

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, ChevronRight, Dumbbell, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markSessionComplete } from "@/features/payments";
import {
  useTrainerWeekSchedule,
  type TrainerDaySession,
} from "@/features/trainer-ops/hooks/useTrainerWeekSchedule";
import {
  getWeekDays,
  shiftISODate,
  startOfWeekISO,
  toISODate,
  DAYS_IN_WEEK,
} from "@/features/trainer-ops/lib/week";
import type { RosterClientDetail } from "@/types/roster";
import { TrainerDaySchedule } from "./TrainerDaySchedule";
import { TrainerDayStrip } from "./TrainerDayStrip";

export interface TrainerTodaySurfaceProps {
  /** The logged-in trainer's id — scopes every schedule read. */
  trainerId: string | undefined;
  /** Roster from useTrainerTodayData (drives the "no clients yet" empty state). */
  clients: RosterClientDetail[];
  isLoading: boolean;
  error: Error | null;
}

function withKey(keys: Set<string>, key: string): Set<string> {
  const next = new Set(keys);
  next.add(key);
  return next;
}

function withoutKey(keys: Set<string>, key: string): Set<string> {
  const next = new Set(keys);
  next.delete(key);
  return next;
}

export function TrainerTodaySurface({
  trainerId,
  clients,
  isLoading,
  error,
}: TrainerTodaySurfaceProps) {
  const router = useRouter();

  // The ONE device-local today for this surface, computed once per mount.
  const [today] = useState(() => toISODate(new Date()));
  // Default selection is always today, on every mount.
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekStart, setWeekStart] = useState(() => startOfWeekISO(today));

  // Rows flipped locally while their write is in flight / already succeeded.
  const [optimisticKeys, setOptimisticKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [markingKeys, setMarkingKeys] = useState<Set<string>>(() => new Set());

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const rangeStart = weekDays[0];
  const rangeEnd = weekDays[DAYS_IN_WEEK - 1];

  const schedule = useTrainerWeekSchedule({
    trainerId,
    enabled: Boolean(trainerId),
    rangeStart,
    rangeEnd,
    selectedDate,
  });

  const daySessions = useMemo(
    () =>
      schedule.daySessions.map((row) =>
        optimisticKeys.has(row.completedKey)
          ? { ...row, isMarkedComplete: true }
          : row,
      ),
    [schedule.daySessions, optimisticKeys],
  );

  const handleShiftWeek = (deltaWeeks: number) => {
    const delta = deltaWeeks * DAYS_IN_WEEK;
    setWeekStart(shiftISODate(weekStart, delta));
    setSelectedDate(shiftISODate(selectedDate, delta));
  };

  // Swipe: move the selection one day, rolling the window at the week edges.
  const handleStepDay = (deltaDays: number) => {
    const target = shiftISODate(selectedDate, deltaDays);
    setSelectedDate(target);
    const targetWeekStart = startOfWeekISO(target);
    if (targetWeekStart !== weekStart) setWeekStart(targetWeekStart);
  };

  // Ledger write ONLY — this never starts, creates or mutates a workout.
  const handleMarkComplete = async (row: TrainerDaySession) => {
    if (row.isMarkedComplete || markingKeys.has(row.completedKey)) return;

    setOptimisticKeys((keys) => withKey(keys, row.completedKey));
    setMarkingKeys((keys) => withKey(keys, row.completedKey));

    try {
      await markSessionComplete({
        clientId: row.clientId,
        source: "pt_completion",
        sessionDate: selectedDate,
        // Synthetic dedupe key — rides client_sessions_dedupe_event so a
        // double-tap (or a second device) collapses to ONE ledger row.
        calendarEventId: row.completedKey,
      });
      toast.success(`Session marked complete for ${row.clientName}`);
      schedule.refresh();
    } catch {
      // Never leave the row in a lying state.
      setOptimisticKeys((keys) => withoutKey(keys, row.completedKey));
      toast.error("Could not mark the session complete. Please try again.");
    } finally {
      setMarkingKeys((keys) => withoutKey(keys, row.completedKey));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
          <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
        </div>
        <div className="h-32 rounded-xl bg-gray-100 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-center text-red-500">
        Could not load trainer data: {error.message}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {/* Quick Actions — trainer mode only, rose accent.
          v1's second slot is Book; booking is Phase 2, so Calendar holds it. */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          className="h-auto py-5 bg-linear-to-br from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 flex flex-col items-center gap-2 rounded-2xl shadow-lg shadow-rose-500/20"
          onClick={() => router.push("/clients")}
        >
          <Users className="w-5 h-5" />
          <span className="font-bold text-sm">Clients</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-5 bg-gray-50 border-gray-200 hover:bg-gray-100 flex flex-col items-center gap-2 rounded-2xl"
          onClick={() => router.push("/calendar")}
        >
          <Calendar className="w-5 h-5 text-sky-500" />
          <span className="font-semibold text-sm text-gray-700">Calendar</span>
        </Button>
      </div>

      <TrainerDayStrip
        weekDays={weekDays}
        selectedDate={selectedDate}
        today={today}
        datesWithSessions={schedule.datesWithSessions}
        sessionCountsByDate={schedule.sessionCountsByDate}
        onSelectDate={setSelectedDate}
        onShiftWeek={handleShiftWeek}
        onStepDay={handleStepDay}
        onOpenCalendar={() => router.push("/calendar")}
      />

      <TrainerDaySchedule
        sessions={daySessions}
        selectedDate={selectedDate}
        today={today}
        hasClients={clients.length > 0}
        isLoading={schedule.isLoading}
        error={schedule.error}
        markingKeys={markingKeys}
        onMarkComplete={handleMarkComplete}
        onOpenClient={(clientId) => router.push(`/clients/${clientId}`)}
        onAddClient={() => router.push("/clients")}
      />

      {/* Quick Link — Workout Builder */}
      <Button
        variant="outline"
        className="w-full h-12 border-gray-200 hover:bg-gray-50 justify-start gap-3"
        onClick={() => router.push("/workout/builder")}
      >
        <Dumbbell className="w-5 h-5 text-rose-500" />
        <span className="font-semibold text-gray-700">
          Open Workout Builder
        </span>
        <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
      </Button>
    </div>
  );
}
