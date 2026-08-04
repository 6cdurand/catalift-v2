// BUG-024 regression lock: neither surface may render until identity
// (session + role) has resolved. See `today/page.tsx`'s `identityResolved`.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockUseScheduledSessions = vi.fn();
vi.mock("@/features/calendar", async () => {
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

vi.mock("@/features/workout-engine/stores/active-workout-store", () => ({
  useActiveWorkoutStore: {
    getState: () => ({
      activeWorkout: null,
      startFromTemplate: vi.fn(),
    }),
  },
}));

const mockUseTodayStats = vi.fn();
vi.mock("@/app/(app)/today/useTodayStats", () => ({
  useTodayStats: () => mockUseTodayStats(),
}));

const { getMockViewOverride, setMockViewOverride } = vi.hoisted(() => {
  let viewOverride: "user" | "trainer" | null = null;
  return {
    getMockViewOverride: () => viewOverride,
    setMockViewOverride: (v: "user" | "trainer" | null) => {
      viewOverride = v;
    },
  };
});

vi.mock("@/hooks/use-view-mode", () => ({
  useViewModeStore: vi.fn((selector) =>
    selector({
      viewOverride: getMockViewOverride(),
      setViewMode: vi.fn(),
      resetViewMode: vi.fn(),
    }),
  ),
}));

const mockUseTrainerTodayData = vi.fn();
vi.mock("@/app/(app)/today/useTrainerTodayData", () => ({
  useTrainerTodayData: () => mockUseTrainerTodayData(),
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

function primeDataMocks() {
  mockUseScheduledSessions.mockReturnValue({
    sessions: [],
    today: "2026-07-29",
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
  mockUseTrainerTodayData.mockReturnValue({
    clients: [],
    isLoading: false,
    error: null,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  setMockViewOverride(null);
});

afterEach(() => {
  cleanup();
});

describe("TodayPage — identity gate (BUG-024)", () => {
  it("renders NEITHER surface while the role is still loading (regression lock)", async () => {
    vi.resetModules();
    vi.doMock("@/features/auth", () => ({
      useSession: () => ({ user: { id: "user-1" }, loading: false }),
      useUserRole: () => ({ role: "client", loading: true }),
    }));
    primeDataMocks();

    const { default: TodayPage } = await import("../page");
    render(<TodayPage />);

    expect(screen.queryByTestId("trainer-surface")).toBeNull();
    expect(screen.queryByTestId("day-strip")).toBeNull();
    expect(screen.getByText("Loading your day…")).toBeDefined();
  });

  it("renders NEITHER surface while the session is still loading", async () => {
    vi.resetModules();
    vi.doMock("@/features/auth", () => ({
      useSession: () => ({ user: undefined, loading: true }),
      useUserRole: () => ({ role: "client", loading: false }),
    }));
    primeDataMocks();

    const { default: TodayPage } = await import("../page");
    render(<TodayPage />);

    expect(screen.queryByTestId("trainer-surface")).toBeNull();
    expect(screen.queryByTestId("day-strip")).toBeNull();
    expect(screen.getByText("Loading your day…")).toBeDefined();
  });

  it("renders the trainer surface only, once a trainer's identity resolves", async () => {
    vi.resetModules();
    vi.doMock("@/features/auth", () => ({
      useSession: () => ({ user: { id: "trainer-1" }, loading: false }),
      useUserRole: () => ({ role: "trainer", loading: false }),
    }));
    primeDataMocks();

    const { default: TodayPage } = await import("../page");
    render(<TodayPage />);

    expect(screen.getByTestId("trainer-surface")).toBeDefined();
    expect(screen.queryByTestId("day-strip")).toBeNull();
    // The mode toggle (v1 :220 guard) appears for a resolved trainer.
    expect(screen.getByRole("button", { name: "Trainer" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Athlete" })).toBeDefined();
  });

  it("renders the athlete surface only, once a client's identity resolves", async () => {
    vi.resetModules();
    vi.doMock("@/features/auth", () => ({
      useSession: () => ({ user: { id: "user-1" }, loading: false }),
      useUserRole: () => ({ role: "client", loading: false }),
    }));
    primeDataMocks();

    const { default: TodayPage } = await import("../page");
    render(<TodayPage />);

    expect(screen.queryByTestId("trainer-surface")).toBeNull();
    expect(screen.getByTestId("day-strip")).toBeDefined();
    // Not a trainer — the mode toggle must not appear.
    expect(screen.queryByRole("button", { name: "Trainer" })).toBeNull();
  });

  it("does not show the mode toggle for a trainer while the role is still loading", async () => {
    vi.resetModules();
    vi.doMock("@/features/auth", () => ({
      useSession: () => ({ user: { id: "trainer-1" }, loading: false }),
      useUserRole: () => ({ role: "client", loading: true }),
    }));
    primeDataMocks();

    const { default: TodayPage } = await import("../page");
    render(<TodayPage />);

    expect(screen.queryByRole("button", { name: "Trainer" })).toBeNull();
  });

  it("renders the athlete surface for a resolved trainer previewing as athlete (view-mode override)", async () => {
    vi.resetModules();
    vi.doMock("@/features/auth", () => ({
      useSession: () => ({ user: { id: "trainer-1" }, loading: false }),
      useUserRole: () => ({ role: "trainer", loading: false }),
    }));
    // BUG-024 fix: `isTrainerMode` is derived from `role` + `viewOverride` in
    // the page itself (no second, independently-resolving role fetch).
    setMockViewOverride("user");
    primeDataMocks();

    const { default: TodayPage } = await import("../page");
    render(<TodayPage />);

    expect(screen.queryByTestId("trainer-surface")).toBeNull();
    expect(screen.getByTestId("day-strip")).toBeDefined();
  });
});
