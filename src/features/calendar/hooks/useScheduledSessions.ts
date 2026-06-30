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
import { useSession } from "@/features/auth";
import {
  getNextProgramWorkout,
  useProgramsStore,
  type ClientProgram,
  type NextWorkoutResult,
  type Weekday,
} from "@/features/programs";

import { buildScheduledSessions, getSessionsForDate } from "../lib/selectors";
import type { ScheduledSession, ScheduledSessionStatus } from "../types";

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

const WEEKDAY_NAMES: Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/**
 * Derive which weeklyPlan indices are completed, from workout dates + program.
 *
 * Fixed mode: each completed date maps to a weekday → weeklyPlan index with
 *   that scheduledDay. Unique set.
 * Flexible mode: sequential [0, 1, ..., min(count, planLength) - 1].
 *
 * This is a MAPPING step (date → plan index), NOT next-day arithmetic.
 */
export function deriveCompletedDayIndices(
  program: ClientProgram,
  completedDates: string[],
): number[] {
  if (completedDates.length === 0) return [];

  if (program.scheduleMode === "flexible") {
    const planLen = program.weeklyPlan.length;
    if (planLen === 0) return [];
    const count = Math.min(completedDates.length, planLen);
    return Array.from({ length: count }, (_, i) => i);
  }

  // Fixed mode: map each completed date → weekday → weeklyPlan index
  const indices = new Set<number>();
  for (const iso of completedDates) {
    const d = new Date(iso + "T00:00:00");
    const weekday = WEEKDAY_NAMES[d.getDay()];
    const planIdx = program.weeklyPlan.findIndex(
      (p) => p.scheduledDay === weekday,
    );
    if (planIdx !== -1) indices.add(planIdx);
  }
  return [...indices];
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
}): { sessions: ScheduledSession[]; todaySessions: ScheduledSession[] } {
  const { program, next, completedDates, rangeStart, rangeEnd, today } = args;

  if (!program) return { sessions: [], todaySessions: [] };

  const sessions = buildScheduledSessions({
    program,
    next,
    completedDates,
    rangeStart,
    rangeEnd,
    today,
  });

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

  // Read active program from the store (no cross-feature mutation).
  const clientPrograms = useProgramsStore((s) => s.clientPrograms);
  const activeProgram =
    clientPrograms.find((p) => p.status === "active") ?? null;

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
      if (!activeProgram || !user) {
        setState({
          sessions: [],
          todaySessions: [],
          isLoading: false,
          error: null,
        });
        return;
      }

      try {
        const supabase = getBrowserClient();
        const { data, error } = await supabase
          .from("workouts")
          .select("performed_at")
          .eq("user_id", user.id)
          .order("performed_at", { ascending: true });

        if (error) throw error;

        const completedDates = (data ?? []).map(
          (r: { performed_at: string }) => r.performed_at.slice(0, 10),
        );

        const completedDayIndices = deriveCompletedDayIndices(
          activeProgram,
          completedDates,
        );

        const next = getNextProgramWorkout(activeProgram, completedDayIndices, []);

        const result = buildScheduledSessionsResult({
          program: activeProgram,
          next,
          completedDates,
          rangeStart,
          rangeEnd,
          today,
        });

        if (!cancelled) {
          setState({
            sessions: result.sessions,
            todaySessions: result.todaySessions,
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
  }, [activeProgram, user, rangeStart, rangeEnd, today]);

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
