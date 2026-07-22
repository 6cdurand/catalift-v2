// Unit tests for active-workout-store.ts (w2a)

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useActiveWorkoutStore } from '../active-workout-store';

// Mock persist (api/persist.ts)
vi.mock('../../api/persist', () => ({
  persist: vi.fn(async () => true),
}));

describe('active-workout-store', () => {
  beforeEach(() => {
    // Reset store
    useActiveWorkoutStore.setState({
      activeWorkout: null,
      workoutTimerSeconds: 0,
      timerRunning: false,
      isFinishing: false,
      hasHydrated: true,
    });
  });

  it('startWorkout creates a LoggedWorkout with uuid id, userId, performedAt=now, empty blocks', () => {
    const { startWorkout } = useActiveWorkoutStore.getState();
    startWorkout({ userId: 'user-123', name: 'Test Workout' });

    const state = useActiveWorkoutStore.getState();
    expect(state.activeWorkout).toBeTruthy();
    expect(state.activeWorkout?.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(state.activeWorkout?.userId).toBe('user-123');
    expect(state.activeWorkout?.name).toBe('Test Workout');
    expect(state.activeWorkout?.blocks).toEqual([]);
    expect(state.activeWorkout?.performedAt).toBeTruthy();
    expect(state.timerRunning).toBe(true);
  });

  it('addExercise creates a straight block with uuid block id + entry id', () => {
    const { startWorkout, addExercise } = useActiveWorkoutStore.getState();
    startWorkout({ userId: 'user-123' });
    addExercise({ exerciseId: 'ex-1', exerciseName: 'Bench Press' });

    const state = useActiveWorkoutStore.getState();
    expect(state.activeWorkout?.blocks.length).toBe(1);
    const block = state.activeWorkout?.blocks[0];
    expect(block?.kind).toBe('straight');
    if (block?.kind === 'straight') {
      expect(block.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(block.exercises[0].id).toMatch(/^[0-9a-f-]{36}$/);
      expect(block.exercises[0].exerciseId).toBe('ex-1');
      expect(block.exercises[0].exerciseName).toBe('Bench Press');
      expect(block.exercises[0].sets).toEqual([]);
    }
  });

  it('addSet adds a LoggedSet with uuid id, setNumber = length+1, completed=false, weight/reps = null', () => {
    const { startWorkout, addExercise, addSet } = useActiveWorkoutStore.getState();
    startWorkout({ userId: 'user-123' });
    addExercise({ exerciseId: 'ex-1', exerciseName: 'Squat' });

    const state1 = useActiveWorkoutStore.getState();
    const block1 = state1.activeWorkout?.blocks[0];
    if (block1?.kind === 'straight') {
      const entryId = block1.exercises[0].id;
      addSet(entryId);

      const state2 = useActiveWorkoutStore.getState();
      const block2 = state2.activeWorkout?.blocks[0];
      if (block2?.kind === 'straight') {
        expect(block2.exercises[0].sets.length).toBe(1);
        const set = block2.exercises[0].sets[0];
        expect(set.id).toMatch(/^[0-9a-f-]{36}$/);
        expect(set.setNumber).toBe(1);
        expect(set.completed).toBe(false);
        expect(set.weight).toBeNull();
        expect(set.reps).toBeNull();
      }
    }
  });

  it('addSet sets previousWeight/previousReps to null (no history in w2a)', () => {
    const { startWorkout, addExercise, addSet } = useActiveWorkoutStore.getState();
    startWorkout({ userId: 'user-123' });
    addExercise({ exerciseId: 'ex-1', exerciseName: 'Deadlift' });

    const state1 = useActiveWorkoutStore.getState();
    const block1 = state1.activeWorkout?.blocks[0];
    if (block1?.kind === 'straight') {
      addSet(block1.exercises[0].id);

      const state2 = useActiveWorkoutStore.getState();
      const block2 = state2.activeWorkout?.blocks[0];
      if (block2?.kind === 'straight') {
        const set = block2.exercises[0].sets[0];
        expect(set.previousWeight).toBeNull();
        expect(set.previousReps).toBeNull();
      }
    }
  });

  it('updateSet patches the named set fields', () => {
    const { startWorkout, addExercise, addSet, updateSet } =
      useActiveWorkoutStore.getState();
    startWorkout({ userId: 'user-123' });
    addExercise({ exerciseId: 'ex-1', exerciseName: 'Press' });

    const state1 = useActiveWorkoutStore.getState();
    const block1 = state1.activeWorkout?.blocks[0];
    if (block1?.kind === 'straight') {
      const entryId = block1.exercises[0].id;
      addSet(entryId);

      const state2 = useActiveWorkoutStore.getState();
      const block2 = state2.activeWorkout?.blocks[0];
      if (block2?.kind === 'straight') {
        const setId = block2.exercises[0].sets[0].id;
        updateSet(entryId, setId, { weight: 100, reps: 10 });

        const state3 = useActiveWorkoutStore.getState();
        const block3 = state3.activeWorkout?.blocks[0];
        if (block3?.kind === 'straight') {
          const set = block3.exercises[0].sets[0];
          expect(set.weight).toBe(100);
          expect(set.reps).toBe(10);
        }
      }
    }
  });

  it('completeSet flips completed=true', () => {
    const { startWorkout, addExercise, addSet, updateSet, completeSet } =
      useActiveWorkoutStore.getState();
    startWorkout({ userId: 'user-123' });
    addExercise({ exerciseId: 'ex-1', exerciseName: 'Row' });

    const state1 = useActiveWorkoutStore.getState();
    const block1 = state1.activeWorkout?.blocks[0];
    if (block1?.kind === 'straight') {
      const entryId = block1.exercises[0].id;
      addSet(entryId);

      const state2 = useActiveWorkoutStore.getState();
      const block2 = state2.activeWorkout?.blocks[0];
      if (block2?.kind === 'straight') {
        const setId = block2.exercises[0].sets[0].id;
        updateSet(entryId, setId, { weight: 80, reps: 8 });
        completeSet(entryId, setId);

        const state3 = useActiveWorkoutStore.getState();
        const block3 = state3.activeWorkout?.blocks[0];
        if (block3?.kind === 'straight') {
          expect(block3.exercises[0].sets[0].completed).toBe(true);
        }
      }
    }
  });

  it('uncompleteSet flips completed=false', () => {
    const { startWorkout, addExercise, addSet, updateSet, completeSet, uncompleteSet } =
      useActiveWorkoutStore.getState();
    startWorkout({ userId: 'user-123' });
    addExercise({ exerciseId: 'ex-1', exerciseName: 'Curl' });

    const state1 = useActiveWorkoutStore.getState();
    const block1 = state1.activeWorkout?.blocks[0];
    if (block1?.kind === 'straight') {
      const entryId = block1.exercises[0].id;
      addSet(entryId);

      const state2 = useActiveWorkoutStore.getState();
      const block2 = state2.activeWorkout?.blocks[0];
      if (block2?.kind === 'straight') {
        const setId = block2.exercises[0].sets[0].id;
        updateSet(entryId, setId, { weight: 20, reps: 12 });
        completeSet(entryId, setId);
        uncompleteSet(entryId, setId);

        const state3 = useActiveWorkoutStore.getState();
        const block3 = state3.activeWorkout?.blocks[0];
        if (block3?.kind === 'straight') {
          expect(block3.exercises[0].sets[0].completed).toBe(false);
        }
      }
    }
  });

  it('removeSet removes the set and renumbers remaining sets (setNumber = idx+1)', () => {
    const { startWorkout, addExercise, addSet, removeSet } =
      useActiveWorkoutStore.getState();
    startWorkout({ userId: 'user-123' });
    addExercise({ exerciseId: 'ex-1', exerciseName: 'Lunge' });

    const state1 = useActiveWorkoutStore.getState();
    const block1 = state1.activeWorkout?.blocks[0];
    if (block1?.kind === 'straight') {
      const entryId = block1.exercises[0].id;
      addSet(entryId);
      addSet(entryId);
      addSet(entryId);

      const state2 = useActiveWorkoutStore.getState();
      const block2 = state2.activeWorkout?.blocks[0];
      if (block2?.kind === 'straight') {
        expect(block2.exercises[0].sets.length).toBe(3);
        const set1Id = block2.exercises[0].sets[0].id;
        removeSet(entryId, set1Id);

        const state3 = useActiveWorkoutStore.getState();
        const block3 = state3.activeWorkout?.blocks[0];
        if (block3?.kind === 'straight') {
          expect(block3.exercises[0].sets.length).toBe(2);
          expect(block3.exercises[0].sets[0].setNumber).toBe(1);
          expect(block3.exercises[0].sets[1].setNumber).toBe(2);
        }
      }
    }
  });

  it('removeExercise removes the straight block whose exercise.id matches', () => {
    const { startWorkout, addExercise, removeExercise } =
      useActiveWorkoutStore.getState();
    startWorkout({ userId: 'user-123' });
    addExercise({ exerciseId: 'ex-1', exerciseName: 'Pull-up' });
    addExercise({ exerciseId: 'ex-2', exerciseName: 'Dip' });

    const state1 = useActiveWorkoutStore.getState();
    expect(state1.activeWorkout?.blocks.length).toBe(2);

    const block1 = state1.activeWorkout?.blocks[0];
    if (block1?.kind === 'straight') {
      removeExercise(block1.exercises[0].id);

      const state2 = useActiveWorkoutStore.getState();
      expect(state2.activeWorkout?.blocks.length).toBe(1);
      const remaining = state2.activeWorkout?.blocks[0];
      if (remaining?.kind === 'straight') {
        expect(remaining.exercises[0].exerciseName).toBe('Dip');
      }
    }
  });

  it('finishWorkout sets totalVolume = SUM(weight*reps) across all completed sets (G-13)', async () => {
    const { startWorkout, addExercise, addSet, updateSet, completeSet, finishWorkout } =
      useActiveWorkoutStore.getState();
    startWorkout({ userId: 'user-123' });
    addExercise({ exerciseId: 'ex-1', exerciseName: 'Squat' });

    const state1 = useActiveWorkoutStore.getState();
    const block1 = state1.activeWorkout?.blocks[0];
    if (block1?.kind === 'straight') {
      const entryId = block1.exercises[0].id;
      addSet(entryId);
      addSet(entryId);

      const state2 = useActiveWorkoutStore.getState();
      const block2 = state2.activeWorkout?.blocks[0];
      if (block2?.kind === 'straight') {
        const set1Id = block2.exercises[0].sets[0].id;
        const set2Id = block2.exercises[0].sets[1].id;
        updateSet(entryId, set1Id, { weight: 100, reps: 10 });
        updateSet(entryId, set2Id, { weight: 110, reps: 8 });
        completeSet(entryId, set1Id);
        completeSet(entryId, set2Id);

        const result = await finishWorkout();
        expect(result).toBeTruthy();
        expect(result?.totalVolume).toBe(100 * 10 + 110 * 8); // 1880
      }
    }
  });

  it('finishWorkout clears activeWorkout on success', async () => {
    const { startWorkout, finishWorkout } = useActiveWorkoutStore.getState();
    startWorkout({ userId: 'user-123' });

    const result = await finishWorkout();
    expect(result).toBeTruthy();

    const state = useActiveWorkoutStore.getState();
    expect(state.activeWorkout).toBeNull();
  });

  it('all ids are valid uuid v4 (G-10)', () => {
    const { startWorkout, addExercise, addSet } = useActiveWorkoutStore.getState();
    startWorkout({ userId: 'user-123' });
    addExercise({ exerciseId: 'ex-1', exerciseName: 'Test' });

    const state1 = useActiveWorkoutStore.getState();
    const block1 = state1.activeWorkout?.blocks[0];
    if (block1?.kind === 'straight') {
      addSet(block1.exercises[0].id);

      const state2 = useActiveWorkoutStore.getState();
      const workoutId = state2.activeWorkout?.id;
      const blockId = block1.id;
      const entryId = block1.exercises[0].id;
      const block2 = state2.activeWorkout?.blocks[0];
      if (block2?.kind === 'straight') {
        const setId = block2.exercises[0].sets[0].id;

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
        expect(workoutId).toMatch(uuidRegex);
        expect(blockId).toMatch(uuidRegex);
        expect(entryId).toMatch(uuidRegex);
        expect(setId).toMatch(uuidRegex);
      }
    }
  });
});
