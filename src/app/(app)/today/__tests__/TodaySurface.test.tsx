import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ClientProgram, NextWorkoutResult } from "@/features/programs";
import type { ScheduledSession } from "@/features/calendar";
import { TodaySurface } from "../TodaySurface";
import type { TodayStats } from "../today-stats";

// TodaySurface is fully presentational — no router / session / supabase seams.
// We drive it purely by props, so "Up Next" is exercised via the getNextProgramWorkout
// result passed in (parity: the surface performs NO next-day math itself).

function makeProgram(overrides: Partial<ClientProgram> = {}): ClientProgram {
  return {
    id: "prog-1",
    clientId: "client-1",
    trainerId: "trainer-1",
    name: "Hypertrophy Block 1",
    status: "active",
    phase: "hypertrophy",
    goal: "hypertrophy",
    weeklyPlan: [
      {
        id: "day-1",
        label: "Push",
        scheduledDay: "monday",
        blocks: [
          {
            id: "block-1",
            type: "work",
            name: "Main Lifts",
            exercises: [
              {
                id: "ex-1",
                exerciseId: "ex-id-1",
                exerciseName: "Bench Press",
                movementPattern: "compound",
                sets: 4,
                reps: "6-8",
                rest: "120s",
                tempo: "3110",
              },
            ],
          },
        ],
      },
      {
        id: "day-2",
        label: "Pull",
        scheduledDay: "wednesday",
        blocks: [],
      },
    ],
    scheduleMode: "fixed",
    trainingDaysPerWeek: 4,
    selectedDays: ["monday", "wednesday"],
    cycleAcrossWeeks: false,
    sessionPTMap: {},
    nextWorkoutIndex: 0,
    autoRepeat: false,
    startDate: "2026-01-05",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function nextFor(program: ClientProgram): NextWorkoutResult {
  return {
    dayIndex: 0,
    day: program.weeklyPlan[0],
    remainingThisWeek: 2,
    completedDayIndices: [0],
    lockedDayIndices: [],
    isScheduledToday: true,
    isExpired: false,
  };
}

const STATS: TodayStats = {
  weekStreak: 4,
  sessionsThisWeek: 3,
  volumeThisWeek: 12500,
  setsThisWeek: 42,
};

const noop = () => {};

function renderSurface(
  props: Partial<React.ComponentProps<typeof TodaySurface>> = {},
) {
  const program = props.activeProgram ?? makeProgram();
  return render(
    <TodaySurface
      activeProgram={program}
      next={props.next ?? nextFor(program)}
      completedDayIndices={props.completedDayIndices ?? [0]}
      stats={props.stats ?? STATS}
      todaySessions={props.todaySessions ?? []}
      onStartWorkout={props.onStartWorkout ?? noop}
      onPreview={props.onPreview ?? noop}
      onSwap={props.onSwap ?? noop}
      onViewHistory={props.onViewHistory ?? noop}
    />,
  );
}

afterEach(() => cleanup());

describe("TodaySurface (F2 rich /today surface)", () => {
  it("renders the full rich surface with an active program + completed session", () => {
    const program = makeProgram();
    const session: ScheduledSession = {
      date: "2026-07-13",
      dayIndex: 0,
      dayRef: "Push",
      label: "Push",
      kind: "program-day",
      status: "upcoming",
    };

    renderSurface({
      activeProgram: program,
      next: nextFor(program),
      completedDayIndices: [0],
      todaySessions: [session],
    });

    // Week strip
    expect(screen.getByText("This week")).toBeDefined();
    // Up Next — sourced from getNextProgramWorkout result (dayIndex 0 → Push)
    expect(screen.getByText("Up Next")).toBeDefined();
    expect(screen.getByText("Start Push")).toBeDefined();
    expect(screen.getByText("2 left this week")).toBeDefined();
    // Quick-start
    expect(screen.getByText("Start Workout")).toBeDefined();
    expect(screen.getByText("History")).toBeDefined();
    // Stats row — non-placeholder values
    expect(screen.getByText("Week Streak")).toBeDefined();
    expect(screen.getByText("4")).toBeDefined(); // streak
    expect(screen.getByText("3")).toBeDefined(); // sessions this week
    expect(screen.getByText("42")).toBeDefined(); // sets
    expect(screen.getByText("13k")).toBeDefined(); // volume
    // Scheduled section retained
    expect(screen.getByText("Scheduled sessions")).toBeDefined();
  });

  it("still shows the rich chrome (week strip + Up Next) on a true rest day", () => {
    const program = makeProgram();

    renderSurface({
      activeProgram: program,
      next: nextFor(program),
      todaySessions: [], // rest day
    });

    // Rich chrome survives a rest day — NOT only "Rest Day".
    expect(screen.getByText("This week")).toBeDefined();
    expect(screen.getByText("Up Next")).toBeDefined();
    expect(screen.getByText("Start Workout")).toBeDefined();
    expect(screen.getByText("Week Streak")).toBeDefined();
    // The rest-day state is present as one section, not the whole page.
    expect(screen.getByText("Rest Day")).toBeDefined();
  });
});
