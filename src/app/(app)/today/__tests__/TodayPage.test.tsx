import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import type { ClientProgram, NextWorkoutResult } from "@/features/programs";
import type { ScheduledSession } from "@/features/calendar";
import {
  DAYS_IN_WEEK,
  formatAccessibleDate,
  formatWeekdayLong,
  getWeekWindow,
  shiftISODate,
  toISODate,
} from "@/lib/week";
import { userScopedKey } from "@/utils/user-scoped-key";
import { SELECTED_DATE_RESOURCE } from "../selected-date-storage";

const mockPush = vi.fn();

// The page computes its default selection from the real device clock, so derive
// the expectations the same way instead of faking timers.
const TODAY = toISODate(new Date());
const WEEK = getWeekWindow(TODAY);
const OTHER_DAY = WEEK.days.find((d) => d !== TODAY)!;
const STORAGE_KEY = userScopedKey(SELECTED_DATE_RESOURCE, "user-1");

function makeSession(
  date: string,
  overrides: Partial<ScheduledSession> = {},
): ScheduledSession {
  return {
    date,
    programId: "prog-1",
    dayIndex: 1,
    dayRef: "Pull",
    label: "Pull",
    kind: "program-day",
    status: "upcoming",
    ...overrides,
  };
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/features/auth", () => ({
  useSession: () => ({ user: { id: "user-1" }, loading: false }),
  useUserRole: () => ({ role: "client", loading: false }),
}));

const mockUseScheduledSessions = vi.fn();
vi.mock("@/features/calendar", async () => {
  // getSessionsForDate is a pure selector — use the real one (the surface must
  // slice the week with the SAME selector the calendar uses).
  const selectors = await import("@/features/calendar/lib/selectors");
  return {
    useScheduledSessions: (args: { rangeStart: string; rangeEnd: string }) =>
      mockUseScheduledSessions(args),
    getSessionsForDate: selectors.getSessionsForDate,
  };
});

const mockUseActiveClientProgram = vi.fn();
vi.mock("@/features/programs", () => ({
  useActiveClientProgram: () => mockUseActiveClientProgram(),
}));

const mockStartFromTemplate = vi.fn();
vi.mock("@/features/workout-engine/stores/active-workout-store", () => ({
  useActiveWorkoutStore: {
    getState: () => ({
      activeWorkout: null,
      startFromTemplate: mockStartFromTemplate,
    }),
  },
}));

const mockUseTodayStats = vi.fn();
vi.mock("@/app/(app)/today/useTodayStats", () => ({
  useTodayStats: () => mockUseTodayStats(),
}));

vi.mock("@/hooks/use-auth-user", () => ({
  useAuthUser: () => ({
    user: { id: "user-1", email: "test@test.com", mode: "user" },
    isAuthenticated: true,
  }),
}));

vi.mock("@/hooks/use-view-mode", () => ({
  useViewModeStore: vi.fn((selector) =>
    selector({
      viewOverride: null,
      setViewMode: vi.fn(),
      resetViewMode: vi.fn(),
    }),
  ),
}));

vi.mock("@/app/(app)/today/useTrainerTodayData", () => ({
  useTrainerTodayData: () => ({
    clients: [],
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@/app/(app)/today/TrainerTodaySurface", () => ({
  TrainerTodaySurface: () => (
    <div data-testid="trainer-surface">Trainer Surface</div>
  ),
}));

vi.mock("@/components/layouts/MainLayout", () => ({
  PageHeader: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <header data-testid="page-header">{`${title}${subtitle ? ` ${subtitle}` : ""}`}</header>
  ),
}));

vi.mock("@/features/programs/client/dialogs/PreviewDayDialog", () => ({
  PreviewDayDialog: () => null,
}));

vi.mock("@/features/programs/client/dialogs/SwapDayDialog", () => ({
  SwapDayDialog: () => null,
}));

function makeProgram(overrides: Partial<ClientProgram> = {}): ClientProgram {
  return {
    id: "prog-1",
    clientId: "user-1",
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
                exerciseId: "bench-press",
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
    startDate: "2026-07-13",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function nextFor(program: ClientProgram): NextWorkoutResult {
  return {
    dayIndex: 0,
    day: program.weeklyPlan[0],
    remainingThisWeek: 2,
    completedDayIndices: [],
    lockedDayIndices: [],
    isScheduledToday: true,
    isExpired: false,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe("TodayPage (F2 rich surface)", () => {
  it("renders week strip, Up Next, quick-start and stats when the store is hydrated", async () => {
    const program = makeProgram();

    mockUseScheduledSessions.mockReturnValue({
      sessions: [],
      today: TODAY,
      isLoading: false,
      error: null,
    });

    mockUseActiveClientProgram.mockReturnValue({
      activeProgram: program,
      next: nextFor(program),
      completedDayIndices: [],
      oneOffProgram: null,
      oneOffNext: null,
      isLoading: false,
      error: null,
    });

    mockUseTodayStats.mockReturnValue({
      stats: {
        weekStreak: 4,
        sessionsThisWeek: 3,
        volumeThisWeek: 12500,
        setsThisWeek: 42,
      },
      isLoading: false,
      error: null,
    });

    const { default: TodayPage } = await import("../page");
    render(<TodayPage />);

    // Week strip
    expect(screen.getByText("This week")).toBeDefined();
    // Day strip
    expect(screen.getByTestId("day-strip")).toBeDefined();
    // Up Next card
    expect(screen.getByText("Up Next")).toBeDefined();
    expect(screen.getByText("Start Push")).toBeDefined();
    expect(screen.getByText("2 left this week")).toBeDefined();
    // Quick-start buttons
    expect(screen.getByText("Start Workout")).toBeDefined();
    expect(screen.getByText("History")).toBeDefined();
    // Stats row
    expect(screen.getByText("Week Streak")).toBeDefined();
    expect(screen.getByText("This Week")).toBeDefined();
    expect(screen.getByText("Sets")).toBeDefined();
    expect(screen.getByText("Volume")).toBeDefined();
    // Rest day is shown as ONE section, not the whole page
    expect(screen.getByText("Rest Day")).toBeDefined();
    expect(screen.getByText("Scheduled sessions")).toBeDefined();
  });
});

describe("TodayPage trainer mode", () => {
  it("renders trainer surface when mode is trainer", async () => {
    vi.resetModules();

    vi.doMock("@/features/auth", () => ({
      useSession: () => ({ user: { id: "trainer-1" }, loading: false }),
      useUserRole: () => ({ role: "trainer", loading: false }),
    }));
    vi.doMock("@/hooks/use-auth-user", () => ({
      useAuthUser: () => ({
        user: { id: "trainer-1", email: "trainer@test.com", mode: "trainer" },
        isAuthenticated: true,
      }),
    }));

    mockUseScheduledSessions.mockReturnValue({
      sessions: [],
      today: TODAY,
      isLoading: false,
      error: null,
    });

    mockUseActiveClientProgram.mockReturnValue({
      activeProgram: null,
      next: null,
      completedDayIndices: [],
      oneOffProgram: null,
      oneOffNext: null,
      isLoading: false,
      error: null,
    });

    mockUseTodayStats.mockReturnValue({
      stats: {
        weekStreak: 0,
        sessionsThisWeek: 0,
        volumeThisWeek: 0,
        setsThisWeek: 0,
      },
      isLoading: false,
      error: null,
    });

    const { default: TodayPage } = await import("../page");
    render(<TodayPage />);

    expect(screen.getByTestId("trainer-surface")).toBeDefined();
    expect(screen.queryByText("Up Next")).toBeNull();
  });

  it("renders athlete surface when mode is user", async () => {
    vi.resetModules();

    vi.doMock("@/features/auth", () => ({
      useSession: () => ({ user: { id: "trainer-1" }, loading: false }),
      useUserRole: () => ({ role: "trainer", loading: false }),
    }));
    vi.doMock("@/hooks/use-auth-user", () => ({
      useAuthUser: () => ({
        user: { id: "trainer-1", email: "trainer@test.com", mode: "user" },
        isAuthenticated: true,
      }),
    }));

    const program = makeProgram();

    mockUseScheduledSessions.mockReturnValue({
      sessions: [],
      today: TODAY,
      isLoading: false,
      error: null,
    });

    mockUseActiveClientProgram.mockReturnValue({
      activeProgram: program,
      next: nextFor(program),
      completedDayIndices: [],
      oneOffProgram: null,
      oneOffNext: null,
      isLoading: false,
      error: null,
    });

    mockUseTodayStats.mockReturnValue({
      stats: {
        weekStreak: 4,
        sessionsThisWeek: 3,
        volumeThisWeek: 12500,
        setsThisWeek: 42,
      },
      isLoading: false,
      error: null,
    });

    const { default: TodayPage } = await import("../page");
    render(<TodayPage />);

    expect(screen.queryByTestId("trainer-surface")).toBeNull();
    expect(screen.getByText("Up Next")).toBeDefined();
  });
});

// ─── Phase 1b: the athlete day selector ───────────────────────────────────

/**
 * Wire the standard athlete-mode mocks, with `sessions` for the visible week.
 *
 * The trainer-mode describes above call vi.doMock with a DIFFERENT user id, and
 * those registrations persist, so re-assert athlete identity here — the
 * sessionStorage key is user-scoped and would otherwise not match STORAGE_KEY.
 */
function primeAthleteMode(sessions: ScheduledSession[] = []) {
  vi.resetModules();
  vi.doMock("@/features/auth", () => ({
    useSession: () => ({ user: { id: "user-1" }, loading: false }),
    useUserRole: () => ({ role: "client", loading: false }),
  }));
  vi.doMock("@/hooks/use-auth-user", () => ({
    useAuthUser: () => ({
      user: { id: "user-1", email: "test@test.com", mode: "user" },
      isAuthenticated: true,
    }),
  }));

  const program = makeProgram();

  mockUseScheduledSessions.mockReturnValue({
    sessions,
    today: TODAY,
    isLoading: false,
    error: null,
  });

  mockUseActiveClientProgram.mockReturnValue({
    activeProgram: program,
    next: nextFor(program),
    completedDayIndices: [],
    oneOffProgram: null,
    oneOffNext: null,
    isLoading: false,
    error: null,
  });

  mockUseTodayStats.mockReturnValue({
    stats: {
      weekStreak: 0,
      sessionsThisWeek: 0,
      volumeThisWeek: 0,
      setsThisWeek: 0,
    },
    isLoading: false,
    error: null,
  });

  return program;
}

function dayPill(iso: string) {
  return screen.getByRole("button", {
    name: new RegExp(formatAccessibleDate(iso)),
  });
}

describe("TodayPage — selected date", () => {
  it("defaults to today and asks useScheduledSessions for Mon→Sun of that week", async () => {
    primeAthleteMode();

    const { default: TodayPage } = await import("../page");
    render(<TodayPage />);

    expect(mockUseScheduledSessions).toHaveBeenCalledWith({
      rangeStart: WEEK.rangeStart,
      rangeEnd: WEEK.rangeEnd,
    });
    expect(screen.getByTestId("page-header").textContent).toContain("Today");
  });

  it("restores the selection from sessionStorage (user-scoped key)", async () => {
    sessionStorage.setItem(STORAGE_KEY, OTHER_DAY);
    primeAthleteMode();

    const { default: TodayPage } = await import("../page");
    render(<TodayPage />);

    expect(screen.getByTestId("page-header").textContent).toContain(
      formatWeekdayLong(OTHER_DAY),
    );
    expect(dayPill(OTHER_DAY).getAttribute("aria-pressed")).toBe("true");
  });

  it("honours a stored date from ANOTHER week and moves the range with it", async () => {
    const nextWeekDay = shiftISODate(TODAY, DAYS_IN_WEEK);
    sessionStorage.setItem(STORAGE_KEY, nextWeekDay);
    primeAthleteMode();

    const { default: TodayPage } = await import("../page");
    render(<TodayPage />);

    expect(mockUseScheduledSessions).toHaveBeenLastCalledWith({
      rangeStart: shiftISODate(WEEK.rangeStart, DAYS_IN_WEEK),
      rangeEnd: shiftISODate(WEEK.rangeEnd, DAYS_IN_WEEK),
    });
  });

  it("ignores a corrupt stored value and falls back to today", async () => {
    sessionStorage.setItem(STORAGE_KEY, "not-a-date");
    primeAthleteMode();

    const { default: TodayPage } = await import("../page");
    render(<TodayPage />);

    expect(screen.getByTestId("page-header").textContent).toContain("Today");
  });

  it("persists a tapped day to sessionStorage", async () => {
    primeAthleteMode();

    const { default: TodayPage } = await import("../page");
    render(<TodayPage />);

    fireEvent.click(dayPill(OTHER_DAY));

    expect(sessionStorage.getItem(STORAGE_KEY)).toBe(OTHER_DAY);
  });

  it("moves the range a whole week with the next-week chevron", async () => {
    primeAthleteMode();

    const { default: TodayPage } = await import("../page");
    render(<TodayPage />);

    fireEvent.click(screen.getByRole("button", { name: "Next week" }));

    expect(mockUseScheduledSessions).toHaveBeenLastCalledWith({
      rangeStart: shiftISODate(WEEK.rangeStart, DAYS_IN_WEEK),
      rangeEnd: shiftISODate(WEEK.rangeEnd, DAYS_IN_WEEK),
    });
  });
});

describe("TodayPage — start on another day (confirm)", () => {
  /** Select OTHER_DAY and tap Start on its session row. */
  async function startOnOtherDay() {
    primeAthleteMode([makeSession(OTHER_DAY, { dayIndex: 1, label: "Pull" })]);

    const { default: TodayPage } = await import("../page");
    render(<TodayPage />);

    fireEvent.click(dayPill(OTHER_DAY));

    const card = screen.getByTestId("today-session-card");
    fireEvent.click(within(card).getByRole("button", { name: "Start Pull" }));
  }

  it("opens the dialog and starts NOTHING", async () => {
    await startOnOtherDay();

    expect(screen.getByText("Start Workout Today?")).toBeDefined();
    expect(
      screen.getByText(/This session is scheduled for .*\. Start the workout now\?/),
    ).toBeDefined();
    expect(mockStartFromTemplate).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalledWith("/workout/active");
  });

  it("does NOT promise to re-date the session (v2 has no calendar_events)", async () => {
    await startOnOtherDay();

    expect(screen.queryByText(/date will be updated/i)).toBeNull();
  });

  it("Start Now starts THAT day's dayIndex and resets the selection to today", async () => {
    await startOnOtherDay();

    fireEvent.click(screen.getByRole("button", { name: /Start Now/ }));

    // dayIndex 1 === "Pull" — the explicit index, not the "Up Next" day 0.
    expect(mockStartFromTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        name: "Pull - Hypertrophy Block 1",
      }),
    );
    expect(mockPush).toHaveBeenCalledWith("/workout/active");
    expect(screen.getByTestId("page-header").textContent).toContain("Today");
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe(TODAY);
  });

  it("Cancel starts nothing and closes the dialog", async () => {
    await startOnOtherDay();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mockStartFromTemplate).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalledWith("/workout/active");
    expect(screen.queryByText("Start Workout Today?")).toBeNull();
  });
});
