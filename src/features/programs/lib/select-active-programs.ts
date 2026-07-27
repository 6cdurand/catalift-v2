// Pure program-selection helpers (BACKLOG P2: one-off / multi-week coexistence).
//
// The problem: useActiveClientProgram and useScheduledSessions both used
// `find(p => p.status === "active")` — first-active-wins. When a trainer saves
// a one-off session (workout builder → assignProgramToClient), it creates a
// second active ClientProgram. Whichever row comes first in the array shadows
// the other on Today/Calendar.
//
// Solution (confirmed strategy: "dated one-off precedence"):
//   - A single-day program (weeklyPlan.length === 1, trainingDaysPerWeek === 1)
//     is a "dated one-off" — it surfaces ONLY on its startDate.
//   - The multi-week program remains the base "active program" for all other days.
//   - When both apply to the same date, the one-off takes precedence for that
//     day only; the multi-week program is never mutated.
//
// These helpers are PURE — no store reads, no fetches, no Date.now().
// `today` is injected by the caller.

import type { ClientProgram } from "../types";

/**
 * Identify a dated one-off: a single-session program saved by the workout
 * builder. Shape: one ProgramDay + trainingDaysPerWeek === 1.
 */
export function isDatedOneOff(program: ClientProgram): boolean {
  return (
    program.weeklyPlan.length === 1 && program.trainingDaysPerWeek === 1
  );
}

export interface SelectedActivePrograms {
  /** The ongoing multi-week program (or the only active program if no multi-week exists). */
  baseProgram: ClientProgram | null;
  /** A dated one-off whose startDate === today (only returned when a base multi-week program exists). */
  oneOffForToday: ClientProgram | null;
}

/**
 * Deterministic, date-aware selection from a client's active programs.
 *
 * - baseProgram = first active NON-one-off (the multi-week program).
 *   Falls back to first active one-off if no multi-week exists (so a
 *   one-off-only client still sees their program on the /program page).
 * - oneOffForToday = a dated one-off whose startDate === today.
 *   Only returned when a separate multi-week base exists (otherwise the
 *   one-off IS the base and no overlay is needed).
 */
export function selectActivePrograms(
  programs: ClientProgram[],
  today: string,
): SelectedActivePrograms {
  const active = programs.filter((p) => p.status === "active");
  if (active.length === 0) {
    return { baseProgram: null, oneOffForToday: null };
  }

  const oneOffs = active.filter(isDatedOneOff);
  const multiWeek = active.filter((p) => !isDatedOneOff(p));

  const baseProgram = multiWeek[0] ?? oneOffs[0] ?? null;

  // Only surface a one-off overlay when a separate multi-week base exists.
  const oneOffForToday =
    multiWeek.length > 0
      ? (oneOffs.find((p) => p.startDate === today) ?? null)
      : null;

  return { baseProgram, oneOffForToday };
}
