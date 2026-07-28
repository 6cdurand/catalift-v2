import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import type { ClientProgram, NextWorkoutResult } from "@/features/programs";
import type { ScheduledSession } from "@/features/calendar";
import { getWeekDays } from "@/lib/week";
import { TodaySurface } from "../TodaySurface";
import type { TodayStats } from "../today-stats";

// TodaySurface is fully presentational — no router / session / supabase seams.
// We drive it purely by props, so "Up Next" is exercised via the getNextProgramWorkout
// result passed in (parity: the surface performs NO next-day math itself).

// Fixed week so past / today / future are unambiguous: 2026-07-29 is a Wednesday.
const TODAY = "2026-07-29";
const WEEK_DAYS = getWeekDays("2026-07-27"); // Mon 27 Jul → Sun 2 Aug
const PAST_DAY = "2026-07-27";
const FUTURE_DAY = "2026-07-30";

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

const onSelectDate = vi.fn();
const onShiftWeek = vi.fn();
const onStepDay = vi.fn();
const onOpenCalendar = vi.fn();
const onStartSession = vi.fn();

function session(
  date: string,
  overrides: Partial<ScheduledSession> = {},
): ScheduledSession {
  return {
    date,
    programId: "prog-1",
    dayIndex: 0,
    dayRef: "Push",
    label: "Push",
    kind: "program-day",
    status: "upcoming",
    ...overrides,
  };
}

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
      sessions={props.sessions ?? []}
      weekDays={props.weekDays ?? WEEK_DAYS}
      selectedDate={props.selectedDate ?? TODAY}
      today={props.today ?? TODAY}
      onSelectDate={props.onSelectDate ?? onSelectDate}
      onShiftWeek={props.onShiftWeek ?? onShiftWeek}
      onStepDay={props.onStepDay ?? onStepDay}
      onOpenCalendar={props.onOpenCalendar ?? onOpenCalendar}
      onStartSession={props.onStartSession ?? onStartSession}
      onStartWorkout={props.onStartWorkout ?? noop}
      onBuildWorkout={props.onBuildWorkout ?? noop}
      onPreview={props.onPreview ?? noop}
      onSwap={props.onSwap ?? noop}
      onViewHistory={props.onViewHistory ?? noop}
    />,
  );
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe("TodaySurface (F2 rich /today surface)", () => {
  it("renders the full rich surface with an active program + completed session", () => {
    const program = makeProgram();

    renderSurface({
      activeProgram: program,
      next: nextFor(program),
      completedDayIndices: [0],
      sessions: [session(TODAY)],
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
      sessions: [], // rest day
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

describe("TodaySurface — day strip (Phase 1b)", () => {
  it("renders the strip above everything, with dots ONLY on days that have sessions", () => {
    renderSurface({ sessions: [session(TODAY), session(FUTURE_DAY)] });

    const strip = screen.getByTestId("day-strip");
    expect(strip).toBeDefined();
    expect(screen.getByTestId(`day-dot-${TODAY}`)).toBeDefined();
    expect(screen.getByTestId(`day-dot-${FUTURE_DAY}`)).toBeDefined();
    expect(screen.queryByTestId(`day-dot-${PAST_DAY}`)).toBeNull();
  });

  it("makes FUTURE days reachable — tapping one asks the page to select it", () => {
    renderSurface({ sessions: [session(FUTURE_DAY)] });

    fireEvent.click(screen.getByRole("button", { name: /Thursday 30 July/ }));

    expect(onSelectDate).toHaveBeenCalledWith(FUTURE_DAY);
  });

  it("keeps the day strip AND the program WeeklyProgressStrip", () => {
    renderSurface({ sessions: [session(TODAY)] });

    expect(screen.getByTestId("day-strip")).toBeDefined();
    expect(screen.getByText("This week")).toBeDefined();
  });
});

describe("TodaySurface — another day selected", () => {
  it("shows that day's sessions and hides Up Next + the stats row", () => {
    renderSurface({
      selectedDate: FUTURE_DAY,
      sessions: [
        session(TODAY, { label: "Push" }),
        session(FUTURE_DAY, { label: "Pull", dayIndex: 1 }),
      ],
    });

    expect(screen.getByText("Schedule — Jul 30")).toBeDefined();
    // Exactly ONE row — the selected day's, not today's. (Day labels also appear
    // in the program WeeklyProgressStrip, so scope to the session cards.)
    const cards = screen.getAllByTestId("today-session-card");
    expect(cards).toHaveLength(1);
    expect(within(cards[0]).getByText("Pull")).toBeDefined();
    // Up Next is today-only; the stats row is a this-week aggregate.
    expect(screen.queryByText("Up Next")).toBeNull();
    expect(screen.queryByText("Week Streak")).toBeNull();
    expect(screen.queryByText("Scheduled sessions")).toBeNull();
  });

  it("offers Start on a startable row and reports the SESSION back to the page", () => {
    const pull = session(FUTURE_DAY, { label: "Pull", dayIndex: 1 });
    renderSurface({ selectedDate: FUTURE_DAY, sessions: [pull] });

    const card = screen.getByTestId("today-session-card");
    fireEvent.click(within(card).getByRole("button", { name: "Start Pull" }));

    expect(onStartSession).toHaveBeenCalledWith(pull);
  });

  it("renders a past day's missed session, still startable", () => {
    renderSurface({
      selectedDate: PAST_DAY,
      sessions: [session(PAST_DAY, { label: "Legs", status: "missed" })],
    });

    expect(screen.getByText("Schedule — Jul 27")).toBeDefined();
    const card = screen.getByTestId("today-session-card");
    expect(within(card).getByText("missed")).toBeDefined();
    expect(
      within(card).getByRole("button", { name: "Start Legs" }),
    ).toBeDefined();
  });

  it("does NOT offer Start on an already-completed row", () => {
    renderSurface({
      selectedDate: PAST_DAY,
      sessions: [session(PAST_DAY, { label: "Legs", status: "done" })],
    });

    const card = screen.getByTestId("today-session-card");
    expect(within(card).queryByRole("button")).toBeNull();
  });

  it("words the rest-day empty state for the SELECTED day", () => {
    renderSurface({ selectedDate: FUTURE_DAY, sessions: [session(TODAY)] });

    expect(screen.getByText("Rest Day")).toBeDefined();
    expect(
      screen.getByText(/No training scheduled for Thursday/),
    ).toBeDefined();
  });

  it("never offers Start on today's rows (today keeps its current layout)", () => {
    renderSurface({ sessions: [session(TODAY, { label: "Push" })] });

    // Today's Start lives on the Up Next card, never on the session row.
    const card = screen.getByTestId("today-session-card");
    expect(within(card).queryByRole("button")).toBeNull();
  });
});
