// BUG-025 regression lock: /workout/active must NOT auto-start a workout on
// mount. Arriving with no active workout must fall through to
// shouldRedirectFromActiveWorkout -> router.replace('/workouts'). Arriving
// WITH an active workout must render in place (no redirect).

import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from "vitest";
import { render, waitFor, cleanup } from "@testing-library/react";
import type { LoggedWorkout } from "@/features/workout-engine/types";

// jsdom has no matchMedia; the page renders sonner's <Toaster /> unconditionally,
// which reads it on mount. Polyfill so the render doesn't crash.
beforeAll(() => {
  window.matchMedia =
    window.matchMedia ||
    ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
});

const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

vi.mock("@/features/auth", () => ({
  useSession: () => ({ user: { id: "user-1" }, loading: false }),
}));

const mockStartWorkout = vi.fn();
let mockActiveWorkout: LoggedWorkout | null = null;

vi.mock("@/features/workout-engine/stores/active-workout-store", () => ({
  useActiveWorkoutStore: () => ({
    activeWorkout: mockActiveWorkout,
    hasHydrated: true,
    isFinishing: false,
    workoutTimerSeconds: 0,
    timerRunning: false,
    tickTimer: vi.fn(),
    restTimer: { isRunning: false, seconds: 0 },
    startWorkout: mockStartWorkout,
    addBlock: vi.fn(),
    setActiveBlock: vi.fn(),
    setWorkoutNotes: vi.fn(),
    addExercise: vi.fn(),
    removeExercise: vi.fn(),
    addCircuitBlock: vi.fn(),
    removeBlock: vi.fn(),
    addRound: vi.fn(),
    addSet: vi.fn(),
    updateSet: vi.fn(),
    completeSet: vi.fn(),
    uncompleteSet: vi.fn(),
    removeSet: vi.fn(),
    addDropSet: vi.fn(),
    updateDrop: vi.fn(),
    removeDrop: vi.fn(),
    createSuperset: vi.fn(),
    addCardioBlock: vi.fn(),
    updateCardio: vi.fn(),
    finishWorkout: vi.fn(),
    setPreviousBests: vi.fn(),
    startRestTimer: vi.fn(),
    tickRestTimer: vi.fn(),
    resetRestTimer: vi.fn(),
    pauseWorkoutTimer: vi.fn(),
    resumeWorkoutTimer: vi.fn(),
  }),
}));

vi.mock("@/features/workout-engine/api/fetch-history", () => ({
  fetchWorkoutHistoryWithBlocks: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/features/workout-engine/api/fetch-personal-bests", () => ({
  fetchPersonalBests: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/features/workout-engine/api/upsert-personal-bests", () => ({
  upsertPersonalBests: vi.fn(),
}));

// Import AFTER the mocks above are registered.
const { default: ActiveWorkoutPage } = await import("../page");

describe("ActiveWorkoutPage mount (BUG-025)", () => {
  beforeEach(() => {
    mockActiveWorkout = null;
  });

  afterEach(() => {
    cleanup();
  });

  it("with no active workout: does NOT auto-start a workout, redirects to /workouts", async () => {
    render(<ActiveWorkoutPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/workouts");
    });
    expect(mockStartWorkout).not.toHaveBeenCalled();
  });

  it("with an active workout: does not redirect", async () => {
    mockActiveWorkout = {
      id: "w1",
      userId: "user-1",
      name: "Workout",
      performedAt: new Date().toISOString(),
      blocks: [],
      totalVolume: 0,
    };

    render(<ActiveWorkoutPage />);

    // Give any pending effects a chance to flush, then assert no redirect fired.
    await new Promise((r) => setTimeout(r, 0));
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockStartWorkout).not.toHaveBeenCalled();
  });
});
