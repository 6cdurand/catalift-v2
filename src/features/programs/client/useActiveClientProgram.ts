"use client";

// w3 — the ONE data hook for the client program page.
//
// Encapsulates the canonical next-day pipeline so the /program page renders the
// SAME "Up Next" the calendar/today surfaces do:
//   1. fetch the signed-in client's assigned programs (user-scoped by client_id)
//   2. hydrate the programs store + pick the active program
//   3. fetch completed workout dates (same query the calendar hook uses)
//   4. deriveCompletedDayIndices → getNextProgramWorkout  (NO local next-day math)
//
// Parity law (BUG-001/010): this hook does NOT compute a day index itself; it
// only feeds the shared pure resolver. grep-guard: no rotation/day-index logic here.

import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase";
import {
  fetchClientProgramsForClient,
  getNextProgramWorkout,
  useProgramsStore,
  type ClientProgram,
  type NextWorkoutResult,
} from "@/features/programs";
import { deriveCompletedDayIndices } from "../lib/derive-completed-days";

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface UseActiveClientProgramResult {
  activeProgram: ClientProgram | null;
  next: NextWorkoutResult | null;
  completedDayIndices: number[];
  isLoading: boolean;
  error: Error | null;
}

export function useActiveClientProgram(
  userId: string | null | undefined,
  sessionLoading: boolean,
): UseActiveClientProgramResult {
  const clientPrograms = useProgramsStore((s) => s.clientPrograms);
  const hydrateClientPrograms = useProgramsStore((s) => s.hydrateClientPrograms);

  const [state, setState] = useState<{
    next: NextWorkoutResult | null;
    completedDayIndices: number[];
    isLoading: boolean;
    error: Error | null;
  }>({ next: null, completedDayIndices: [], isLoading: true, error: null });

  useEffect(() => {
    if (sessionLoading) return;

    let cancelled = false;

    async function load() {
      if (!userId) {
        if (!cancelled) {
          setState({ next: null, completedDayIndices: [], isLoading: false, error: null });
        }
        return;
      }
      try {
        const programs = await fetchClientProgramsForClient(userId);
        if (cancelled) return;
        hydrateClientPrograms(programs);

        const active = programs.find((p) => p.status === "active") ?? null;
        if (!active) {
          setState({ next: null, completedDayIndices: [], isLoading: false, error: null });
          return;
        }

        // Completed workout dates for this client (same source as the calendar hook).
        const supabase = getBrowserClient();
        const { data, error } = await supabase
          .from("workouts")
          .select("performed_at")
          .eq("user_id", userId)
          .order("performed_at", { ascending: true });
        if (error) throw error;

        const completedDates = (data ?? []).map(
          (r: { performed_at: string }) => toISODate(new Date(r.performed_at)),
        );
        const completedDayIndices = deriveCompletedDayIndices(active, completedDates);
        const next = getNextProgramWorkout(active, completedDayIndices, []);

        if (!cancelled) {
          setState({ next, completedDayIndices, isLoading: false, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            next: null,
            completedDayIndices: [],
            isLoading: false,
            error: err as Error,
          });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, sessionLoading, hydrateClientPrograms]);

  const activeProgram = clientPrograms.find((p) => p.status === "active") ?? null;

  return {
    activeProgram,
    next: state.next,
    completedDayIndices: state.completedDayIndices,
    isLoading: state.isLoading,
    error: state.error,
  };
}
