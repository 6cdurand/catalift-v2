import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ClientProgram, NextWorkoutResult } from "@/features/programs";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/features/auth", () => ({
  useSession: () => ({ user: { id: "user-1" }, loading: false }),
  useUserRole: () => ({ role: "client", loading: false }),
}));

const mockUseScheduledSessions = vi.fn();
vi.mock("@/features/calendar", () => ({
  useScheduledSessions: () => mockUseScheduledSessions(),
}));

const mockUseActiveClientProgram = vi.fn();
vi.mock("@/features/programs", () => ({
  useActiveClientProgram: () => mockUseActiveClientProgram(),
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
    stats: { active: 0, pending: 0, total: 0 },
    recentCompletions: [],
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
});

afterEach(() => {
  cleanup();
});

describe("TodayPage (F2 rich surface)", () => {
  it("renders week strip, Up Next, quick-start and stats when the store is hydrated", async () => {
    const program = makeProgram();

    mockUseScheduledSessions.mockReturnValue({
      todaySessions: [],
      today: "2026-07-19",
      isLoading: false,
      error: null,
    });

    mockUseActiveClientProgram.mockReturnValue({
      activeProgram: program,
      next: nextFor(program),
      completedDayIndices: [],
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
      todaySessions: [],
      today: "2026-07-19",
      isLoading: false,
      error: null,
    });

    mockUseActiveClientProgram.mockReturnValue({
      activeProgram: null,
      next: null,
      completedDayIndices: [],
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
      todaySessions: [],
      today: "2026-07-19",
      isLoading: false,
      error: null,
    });

    mockUseActiveClientProgram.mockReturnValue({
      activeProgram: program,
      next: nextFor(program),
      completedDayIndices: [],
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
