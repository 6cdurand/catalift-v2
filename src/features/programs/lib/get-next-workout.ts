// Pure next-workout resolver (Programs Wave 1).
//
// Rebuilt from v1 `trainerStore.ts` (~line 1783-1940) where it was buried in a
// 3395-line store and could not be unit-tested. This version takes the program +
// completion state as arguments and returns a plain result, so every branch is
// testable.
//
// Fixes:
//   BUG-001 (fixed-day): on Saturday with nothing done, v1's "first uncompleted"
//     loop returned index 0 (Monday). We anchor to today's scheduledDay instead.
//   BUG-010 (flexible/expired): after a full Push->Pull->Legs cycle, v1 returned
//     index 1 (Pull). We advance from the most recently completed day and wrap.
//
// See .pipeline/v2-programs-w1/spec.md.

import type { ClientProgram, ProgramDay, Weekday } from "../types";

const WEEKDAY_NAMES: Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export interface NextWorkoutResult {
  dayIndex: number;
  day: ProgramDay | null;
  remainingThisWeek: number;
  completedDayIndices: number[];
  lockedDayIndices: number[];
  isScheduledToday: boolean;
  nextScheduledDay?: Weekday;
  isExpired: boolean;
}

export function getNextProgramWorkout(
  program: ClientProgram,
  completedDayIndices: number[],
  lockedDayIndices: number[],
  now: Date = new Date(),
): NextWorkoutResult {
  const plan = program.weeklyPlan;
  if (!plan.length) return emptyResult();

  const todayName = WEEKDAY_NAMES[now.getDay()];
  const isExpired =
    !!program.endDate &&
    new Date(program.endDate) < now &&
    !program.autoRepeat;

  // --- FIXED mode: anchor to today's scheduledDay ---
  if (program.scheduleMode === "fixed") {
    const todayPlanIdx = plan.findIndex((d) => d.scheduledDay === todayName);
    if (
      todayPlanIdx !== -1 &&
      !completedDayIndices.includes(todayPlanIdx) &&
      !lockedDayIndices.includes(todayPlanIdx)
    ) {
      return buildResult(
        todayPlanIdx,
        program,
        completedDayIndices,
        lockedDayIndices,
        true,
        todayName,
        isExpired,
      );
    }
    // Today's workout done/locked or today is a rest day → next upcoming scheduled day
    const upcomingIdx = findNextScheduledDay(
      plan,
      todayName,
      completedDayIndices,
      lockedDayIndices,
    );
    if (upcomingIdx !== -1) {
      return buildResult(
        upcomingIdx,
        program,
        completedDayIndices,
        lockedDayIndices,
        false,
        plan[upcomingIdx].scheduledDay,
        isExpired,
      );
    }
  }

  // --- FLEXIBLE mode: next in cycle order after most recently completed ---
  if (program.scheduleMode === "flexible") {
    // Find the most recently completed day index
    const lastCompleted =
      completedDayIndices.length > 0
        ? completedDayIndices[completedDayIndices.length - 1]
        : -1;
    // Next = (lastCompleted + 1) % plan.length, skipping completed/locked
    let nextIdx = (lastCompleted + 1) % plan.length;
    for (let i = 0; i < plan.length; i++) {
      const checkIdx = (lastCompleted + 1 + i) % plan.length;
      if (
        !completedDayIndices.includes(checkIdx) &&
        !lockedDayIndices.includes(checkIdx)
      ) {
        nextIdx = checkIdx;
        break;
      }
    }
    return buildResult(
      nextIdx,
      program,
      completedDayIndices,
      lockedDayIndices,
      false,
      undefined,
      isExpired,
    );
  }

  // --- Fallback: first uncompleted ---
  for (let i = 0; i < plan.length; i++) {
    if (!completedDayIndices.includes(i) && !lockedDayIndices.includes(i)) {
      return buildResult(
        i,
        program,
        completedDayIndices,
        lockedDayIndices,
        false,
        undefined,
        isExpired,
      );
    }
  }

  // All completed → return first (cycle wraps)
  return buildResult(
    0,
    program,
    completedDayIndices,
    lockedDayIndices,
    false,
    undefined,
    isExpired,
  );
}

// Helper: find next upcoming scheduled day (for fixed mode rest days)
function findNextScheduledDay(
  plan: ProgramDay[],
  todayName: Weekday,
  completed: number[],
  locked: number[],
): number {
  const todayIdx = WEEKDAY_NAMES.indexOf(todayName);
  for (let offset = 1; offset <= 7; offset++) {
    const checkDayIdx = (todayIdx + offset) % 7;
    const checkName = WEEKDAY_NAMES[checkDayIdx];
    const planIdx = plan.findIndex((d) => d.scheduledDay === checkName);
    if (planIdx !== -1 && !completed.includes(planIdx) && !locked.includes(planIdx)) {
      return planIdx;
    }
  }
  return -1;
}

function buildResult(
  dayIndex: number,
  program: ClientProgram,
  completed: number[],
  locked: number[],
  isScheduledToday: boolean,
  nextScheduledDay: Weekday | undefined,
  isExpired: boolean,
): NextWorkoutResult {
  const remaining = program.weeklyPlan.length - completed.length;
  return {
    dayIndex,
    day: program.weeklyPlan[dayIndex] ?? null,
    remainingThisWeek: Math.max(0, remaining),
    completedDayIndices: completed,
    lockedDayIndices: locked,
    isScheduledToday,
    nextScheduledDay,
    isExpired,
  };
}

function emptyResult(): NextWorkoutResult {
  return {
    dayIndex: 0,
    day: null,
    remainingThisWeek: 0,
    completedDayIndices: [],
    lockedDayIndices: [],
    isScheduledToday: false,
    isExpired: false,
  };
}

// When saving a FLEXIBLE program, strip scheduledDay from all days.
// v1 BUG-010: stray scheduledDay='saturday' on a flexible day misled the
// weekday-anchor branch. Stripping it on save keeps flexible programs in pure
// cycle order.
export function sanitizeProgramForSave(program: ClientProgram): ClientProgram {
  if (program.scheduleMode === "flexible") {
    return {
      ...program,
      weeklyPlan: program.weeklyPlan.map((d) => ({
        ...d,
        scheduledDay: undefined,
      })),
      selectedDays: [],
    };
  }
  return program;
}
