"use client";

// Calendar Wave 2 — the ONE shared hook that feeds BOTH Today and Calendar.
//
// THE ONE LAW (parity): Today and Calendar render from THIS hook, which calls
// `buildScheduledSessions` ONCE and injects a single `today` value. Today is
// just `getSessionsForDate(sessions, today)` — a slice of the SAME list the
// grid renders. No second query, no second `new Date()`, no day-index/next-day
// arithmetic anywhere in `src/features/calendar/`.

import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase";
import { useSession, useUserRole } from "@/features/auth";
import {
  deriveCompletedDayIndices,
  getNextProgramWorkout,
  selectActivePrograms,
  useProgramsStore,
  type ClientProgram,
  type NextWorkoutResult,
} from "@/features/programs";

import { listVisibleCalendarEvents } from "../api/events";
import { buildScheduledSessions, getSessionsForDate } from "../lib/selectors";
import { mergeCalendarEventsIntoSessions } from "../lib/mergeCalendarEvents";
import type { ScheduledSession, ScheduledSessionStatus } from "../types";

// Re-exported for back-compat: the implementation now lives in the programs
// domain (single source, shared with the client program page) — see BUG parity.
export { deriveCompletedDayIndices };

// ─── Public interface ──────────────────────────────────────────────────────

export interface UseScheduledSessionsArgs {
  rangeStart: string; // ISO YYYY-MM-DD inclusive
  rangeEnd: string; // ISO YYYY-MM-DD inclusive
}

export interface UseScheduledSessionsResult {
  sessions: ScheduledSession[]; // full range — the Calendar grid renders this
  today: string; // the ONE device-local today (computed once here)
  todaySessions: ScheduledSession[]; // === getSessionsForDate(sessions, today)
  isLoading: boolean;
  error: Error | null;
}

// ─── Pure helpers (testable without React) ─────────────────────────────────

/** Format a Date as ISO YYYY-MM-DD using local-time methods. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Pure function that builds the hook's core result from known inputs.
 * The hook calls this after fetching; tests call this directly for parity.
 */
export function buildScheduledSessionsResult(args: {
  program: ClientProgram | null;
  next: NextWorkoutResult | null;
  completedDates: string[];
  rangeStart: string;
  rangeEnd: string;
  today: string;
  oneOffProgram?: ClientProgram | null;
  oneOffNext?: NextWorkoutResult | null;
}): { sessions: ScheduledSession[]; todaySessions: ScheduledSession[] } {
  const { program, next, completedDates, rangeStart, rangeEnd, today, oneOffProgram, oneOffNext } = args;

  if (!program && !oneOffProgram) return { sessions: [], todaySessions: [] };

  let sessions: ScheduledSession[] = [];

  if (program && next) {
    sessions = buildScheduledSessions({
      program,
      next,
      completedDates,
      rangeStart,
      rangeEnd,
      today,
    });
  }

  // Overlay: dated one-off takes precedence on its startDate only.
  if (oneOffProgram && oneOffNext && oneOffNext.day) {
    const oneOffDate = oneOffProgram.startDate;
    if (oneOffDate >= rangeStart && oneOffDate <= rangeEnd) {
      const oneOffSessions = buildScheduledSessions({
        program: oneOffProgram,
        next: oneOffNext,
        completedDates,
        rangeStart,
        rangeEnd,
        today: oneOffDate,
      });
      // Remove base sessions on the one-off's date (precedence).
      sessions = sessions.filter((s) => s.date !== oneOffDate);
      sessions = [...sessions, ...oneOffSessions];
    }
  }

  const todaySessions = getSessionsForDate(sessions, today);

  return { sessions, todaySessions };
}

// ─── The hook ──────────────────────────────────────────────────────────────

export function useScheduledSessions(
  args: UseScheduledSessionsArgs,
): UseScheduledSessionsResult {
  const { rangeStart, rangeEnd } = args;

  // Compute `today` ONCE (device-local ISO) — lazy useState, never recomputed.
  const [today] = useState(() => toISODate(new Date()));

  const { user } = useSession();
  // Determines the `listVisibleCalendarEvents` mode below. Getting this
  // backwards (trainer read as "user") would silently show the wrong
  // person's calendar_events rows — see events.ts:200-239's own warning.
  const { role, loading: roleLoading } = useUserRole(user?.id);

  // Read active programs from the store (no cross-feature mutation).
  const clientPrograms = useProgramsStore((s) => s.clientPrograms);
  const todayISO = toISODate(new Date());
  const { baseProgram, oneOffForToday } = selectActivePrograms(clientPrograms, todayISO);
  const activeProgram = baseProgram ?? oneOffForToday ?? null;

  const [state, setState] = useState<{
    sessions: ScheduledSession[];
    todaySessions: ScheduledSession[];
    isLoading: boolean;
    error: Error | null;
  }>({
    sessions: [],
    todaySessions: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) {
        setState({
          sessions: [],
          todaySessions: [],
          isLoading: false,
          error: null,
        });
        return;
      }
      // Wait for the role to resolve before reading calendar_events — getting
      // "trainer" vs "user" backwards silently shows the wrong calendar.
      if (roleLoading) return;

      try {
        const supabase = getBrowserClient();

        // No program → no workouts to correlate. Booked sessions (below) do
        // not depend on this at all, so this is skipped rather than gated.
        let completedDates: string[] = [];
        if (activeProgram || oneOffForToday) {
          const { data, error } = await supabase
            .from("workouts")
            .select("performed_at")
            .eq("user_id", user.id)
            .order("performed_at", { ascending: true });

          if (error) throw error;

          completedDates = (data ?? []).map(
            (r: { performed_at: string }) => toISODate(new Date(r.performed_at)),
          );
        }

        const program = baseProgram ?? oneOffForToday;
        const completedDayIndices = program
          ? deriveCompletedDayIndices(program, completedDates)
          : [];
        const next = program
          ? getNextProgramWorkout(program, completedDayIndices, [])
          : null;

        // Derive the one-off's next workout independently.
        const oneOffNext = oneOffForToday
          ? getNextProgramWorkout(oneOffForToday, [], [])
          : null;

        const result = buildScheduledSessionsResult({
          program: baseProgram ?? null,
          next,
          completedDates,
          rangeStart,
          rangeEnd,
          today,
          oneOffProgram: oneOffForToday,
          oneOffNext,
        });

        // P-08: fold in booked `calendar_events` rows via the ONE shared merge
        // function (also used by useTrainerWeekSchedule) — never a second
        // "what's on my calendar" implementation. `mode` MUST match this
        // surface's role or layer-2 filtering (getVisibleCalendarEvents)
        // leaks the wrong person's schedule.
        //
        // Best-effort: a calendar_events read failure must not blank the
        // program-derived schedule that already loaded successfully — same
        // contract as fetchAllCompletedDates in useTrainerWeekSchedule.
        let events: Awaited<ReturnType<typeof listVisibleCalendarEvents>> = [];
        try {
          events = await listVisibleCalendarEvents({
            userId: user.id,
            mode: role === "trainer" ? "trainer" : "user",
            rangeStart,
            rangeEnd,
          });
        } catch (eventsErr) {
          console.error(
            "[useScheduledSessions] calendar_events read failed:",
            eventsErr,
          );
        }

        const sessions = mergeCalendarEventsIntoSessions({
          sessions: result.sessions,
          events,
          today,
        });
        const todaySessions = getSessionsForDate(sessions, today);

        if (!cancelled) {
          setState({
            sessions,
            todaySessions,
            isLoading: false,
            error: null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            sessions: [],
            todaySessions: [],
            isLoading: false,
            error: err as Error,
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [
    activeProgram,
    baseProgram,
    oneOffForToday,
    user,
    rangeStart,
    rangeEnd,
    today,
    role,
    roleLoading,
  ]);

  return {
    sessions: state.sessions,
    today,
    todaySessions: state.todaySessions,
    isLoading: state.isLoading,
    error: state.error,
  };
}

// Re-export for convenience
export type { ScheduledSession, ScheduledSessionStatus };
