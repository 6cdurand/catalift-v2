import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ClientProgram } from "@/features/programs";

vi.mock("@/features/auth", () => ({
  useSession: () => ({ user: { id: "client-1" }, loading: false }),
}));

const { mockProgramsStore } = vi.hoisted(() => ({
  mockProgramsStore: {
    clientPrograms: [] as ClientProgram[],
    hydrateClientPrograms: vi.fn(),
  },
}));

vi.mock("@/features/programs", () => ({
  fetchClientProgramsForClient: vi.fn(),
  useProgramsStore: (selector?: (s: typeof mockProgramsStore) => unknown) =>
    selector ? selector(mockProgramsStore) : mockProgramsStore,
}));

vi.mock("@/features/workout-engine/components/block-types", () => ({
  getBlockStyles: () => ({
    border: "border-blue-300",
    accent: "bg-blue-400",
    badge: "bg-blue-100 text-blue-700",
  }),
  getBlockTypeMeta: () => ({ value: "work", label: "Strength", icon: null }),
}));

vi.mock("@/components/layouts/MainLayout", () => ({
  PageHeader: ({ title }: { title: string }) => (
    <header data-testid="page-header">{title}</header>
  ),
}));

import { fetchClientProgramsForClient } from "@/features/programs";
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
    startDate: "2024-01-01",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockProgramsStore.clientPrograms = [];
});

describe("ProgramPage", () => {
  it("renders program name, schedule mode, days, blocks, and exercises", async () => {
    const program = makeProgram();
    vi.mocked(fetchClientProgramsForClient).mockResolvedValue([program]);
    mockProgramsStore.clientPrograms = [program];

    render(<ProgramPage />);

    await waitFor(() => {
      expect(screen.getByText("Hypertrophy Block 1")).toBeDefined();
    });

    expect(screen.getByText("fixed")).toBeDefined();
    expect(screen.getByText(/Day 1.*Push/)).toBeDefined();
    expect(screen.getByText("Main Lifts")).toBeDefined();
    expect(screen.getByText("Bench Press")).toBeDefined();
    expect(screen.getByText("4 × 6-8")).toBeDefined();
    expect(screen.getByText("120s")).toBeDefined();
  });

  it("shows empty state when no program is assigned", async () => {
    vi.mocked(fetchClientProgramsForClient).mockResolvedValue([]);

    render(<ProgramPage />);

    await waitFor(() => {
      expect(screen.getByText("No program assigned yet")).toBeDefined();
    });
  });
});
