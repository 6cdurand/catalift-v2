// Map completed workout dates → weeklyPlan indices (Programs domain).
//
// MOVED here from the calendar feature (was in hooks/useScheduledSessions.ts) so
// that BOTH the calendar and the client program page (w3) share ONE derivation.
// This is a pure MAPPING step (date → plan index); it is NOT next-day
// arithmetic (that lives only in getNextProgramWorkout). Keeping it in the
// programs domain is what lets every surface feed getNextProgramWorkout the
// identical completedDayIndices — the parity law (BUG-001/010).

import type { ClientProgram, Weekday } from "../types";

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
