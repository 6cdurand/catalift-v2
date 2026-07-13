"use client";

import { useActiveWorkoutStore, entriesOfBlock } from "@/features/workout-engine/stores/active-workout-store";

export interface ActiveWorkoutBanner {
  name: string;
  exerciseCount: number;
}

/**
 * Shared hook that adapts the real `useActiveWorkoutStore` into the shape
 * MainLayout's active-workout banner needs (`name` + `exerciseCount`).
 *
 * Returns `null` when no workout is in progress.
 */
export function useActiveWorkoutBanner(): ActiveWorkoutBanner | null {
  const activeWorkout = useActiveWorkoutStore((s) => s.activeWorkout);
  if (!activeWorkout) return null;

  const exerciseCount = activeWorkout.blocks.reduce((count, block) => {
    return count + entriesOfBlock(block).length;
  }, 0);

  return {
    name: activeWorkout.name ?? "Workout in Progress",
    exerciseCount,
  };
}
