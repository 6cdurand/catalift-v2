import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ClientProgram } from "@/features/programs";
import type { NextWorkoutResult } from "@/features/programs";

// ── mocks ────────────────────────────────────────────────────────────────────
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/features/auth", () => ({
  useSession: () => ({ user: { id: "client-1" }, loading: false }),
}));

vi.mock("@/components/layouts/MainLayout", () => ({
  PageHeader: ({ title }: { title: string }) => (
    <header data-testid="page-header">{title}</header>
  ),
}));

// The data hook is the seam — we drive the page purely by its return value.
const hookState: {
  activeProgram: ClientProgram | null;
  next: NextWorkoutResult | null;
  completedDayIndices: number[];
  isLoading: boolean;
  error: Error | null;
} = {
  activeProgram: null,
  next: null,
  completedDayIndices: [],
  isLoading: false,
  error: null,
};

vi.mock("@/features/programs/client/useActiveClientProgram", () => ({
  useActiveClientProgram: () => hookState,
}));

import ProgramPage from "../page";

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
    ],
    scheduleMode: "fixed",
    trainingDaysPerWeek: 4,
    selectedDays: ["monday", "wednesday", "friday", "saturday"],
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
    completedDayIndices: [],
    lockedDayIndices: [],
    isScheduledToday: true,
    isExpired: false,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  hookState.activeProgram = null;
  hookState.next = null;
  hookState.completedDayIndices = [];
  hookState.isLoading = false;
  hookState.error = null;
});

afterEach(() => cleanup());

describe("ProgramPage (w3 client program page)", () => {
  it("shows a loading state while fetching", () => {
    hookState.isLoading = true;
    render(<ProgramPage />);
    expect(screen.getByText("Loading your program…")).toBeDefined();
  });

  it("shows the empty state when no program is assigned", () => {
    hookState.activeProgram = null;
    render(<ProgramPage />);
    expect(screen.getByText("No active program")).toBeDefined();
  });

  it("renders the program with the trainer's exact prescription", () => {
    const program = makeProgram();
    hookState.activeProgram = program;
    hookState.next = nextFor(program);

    render(<ProgramPage />);

    expect(screen.getByText("Hypertrophy Block 1")).toBeDefined();
    // Up Next resolved to Push
    expect(screen.getByText("Start Push")).toBeDefined();
    expect(screen.getByText("2 left this week")).toBeDefined();
    // The prescribed numbers the client trains to
    expect(screen.getByText("Bench Press")).toBeDefined();
    expect(screen.getByText("4 × 6-8")).toBeDefined();
    expect(screen.getByText("120s")).toBeDefined();
  });

  it("shows 'Message trainer' when the program is trainer-assigned (not self)", () => {
    const program = makeProgram({ trainerId: "trainer-1" });
    hookState.activeProgram = program;
    hookState.next = nextFor(program);

    render(<ProgramPage />);

    expect(screen.getByText(/Message/)).toBeDefined();
    expect(screen.queryByText("Edit")).toBeNull();
  });

  it("shows 'Edit' (and no message button) when the program is self-authored", () => {
    const program = makeProgram({ trainerId: "client-1" });
    hookState.activeProgram = program;
    hookState.next = nextFor(program);

    render(<ProgramPage />);

    expect(screen.getByText("Edit")).toBeDefined();
    expect(screen.queryByText(/Message/)).toBeNull();
  });
});
