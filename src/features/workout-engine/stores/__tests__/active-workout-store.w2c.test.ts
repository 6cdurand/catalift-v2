// Unit tests for active-workout-store cardio actions (w2c)

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useActiveWorkoutStore } from '../active-workout-store';

vi.mock('../../api/persist', () => ({
  persist: vi.fn(async () => true),
}));

describe('active-workout-store — cardio actions (w2c)', () => {
  beforeEach(() => {
    useActiveWorkoutStore.setState({
      activeWorkout: null,
      workoutTimerSeconds: 0,
      timerRunning: false,
      isFinishing: false,
      hasHydrated: true,
    });
  });

  it('addCardioBlock creates a cardio block with uuid id, correct exerciseId/exerciseName/cardio', () => {
    const { startWorkout, addCardioBlock } = useActiveWorkoutStore.getState();
    startWorkout({ userId: 'user-123' });
    addCardioBlock({
      exerciseId: 'ex-run',
      exerciseName: 'Running',
      cardio: { durationSeconds: 1800, distanceMeters: 5000, calories: 300 },
    });

    const state = useActiveWorkoutStore.getState();
    expect(state.activeWorkout?.blocks.length).toBe(1);
    const block = state.activeWorkout?.blocks[0];
    expect(block?.kind).toBe('cardio');
    if (block?.kind === 'cardio') {
      expect(block.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(block.exerciseId).toBe('ex-run');
      expect(block.exerciseName).toBe('Running');
      expect(block.cardio.durationSeconds).toBe(1800);
      expect(block.cardio.distanceMeters).toBe(5000);
      expect(block.cardio.calories).toBe(300);
    }
  });

  it('updateCardio patches the cardio payload on the matching block (immutable merge)', () => {
    const { startWorkout, addCardioBlock, updateCardio } = useActiveWorkoutStore.getState();
    startWorkout({ userId: 'user-123' });
    addCardioBlock({
      exerciseId: 'ex-bike',
      exerciseName: 'Cycling',
      cardio: { durationSeconds: 1200 },
    });

    const state1 = useActiveWorkoutStore.getState();
    const block1 = state1.activeWorkout?.blocks[0];
    if (block1?.kind === 'cardio') {
      updateCardio(block1.id, { distanceMeters: 20000, calories: 250 });

      const state2 = useActiveWorkoutStore.getState();
      const block2 = state2.activeWorkout?.blocks[0];
      if (block2?.kind === 'cardio') {
        expect(block2.cardio.durationSeconds).toBe(1200); // preserved
        expect(block2.cardio.distanceMeters).toBe(20000); // patched
        expect(block2.cardio.calories).toBe(250); // patched
      }
    }
  });

  it('updateCardio does not affect other blocks', () => {
    const { startWorkout, addExercise, addCardioBlock, updateCardio } =
      useActiveWorkoutStore.getState();
    startWorkout({ userId: 'user-123' });
    addExercise({ exerciseId: 'ex-squat', exerciseName: 'Squat' });
    addCardioBlock({
      exerciseId: 'ex-run',
      exerciseName: 'Running',
      cardio: { durationSeconds: 600 },
    });

    const state1 = useActiveWorkoutStore.getState();
    const cardioBlock = state1.activeWorkout?.blocks.find((b) => b.kind === 'cardio');
    if (cardioBlock?.kind === 'cardio') {
      updateCardio(cardioBlock.id, { calories: 100 });

      const state2 = useActiveWorkoutStore.getState();
      const straightBlock = state2.activeWorkout?.blocks.find((b) => b.kind === 'straight');
      if (straightBlock?.kind === 'straight') {
        expect(straightBlock.exercises[0].exerciseName).toBe('Squat'); // unchanged
      }
    }
  });

  it('removeBlock removes a cardio block by id', () => {
    const { startWorkout, addCardioBlock, removeBlock } = useActiveWorkoutStore.getState();
    startWorkout({ userId: 'user-123' });
    addCardioBlock({
      exerciseId: 'ex-run',
      exerciseName: 'Running',
      cardio: { durationSeconds: 600 },
    });

    const state1 = useActiveWorkoutStore.getState();
    const blockId = state1.activeWorkout?.blocks[0]?.id;
    expect(state1.activeWorkout?.blocks.length).toBe(1);

    if (blockId) {
      removeBlock(blockId);
      const state2 = useActiveWorkoutStore.getState();
      expect(state2.activeWorkout?.blocks.length).toBe(0);
    }
  });

  it('removeBlock removes a straight block by id (generic)', () => {
    const { startWorkout, addExercise, removeBlock } = useActiveWorkoutStore.getState();
    startWorkout({ userId: 'user-123' });
    addExercise({ exerciseId: 'ex-1', exerciseName: 'Bench Press' });

    const state1 = useActiveWorkoutStore.getState();
    const blockId = state1.activeWorkout?.blocks[0]?.id;
    expect(state1.activeWorkout?.blocks.length).toBe(1);

    if (blockId) {
      removeBlock(blockId);
      const state2 = useActiveWorkoutStore.getState();
      expect(state2.activeWorkout?.blocks.length).toBe(0);
    }
  });

  it('removeBlock does not remove other blocks', () => {
    const { startWorkout, addExercise, addCardioBlock, removeBlock } =
      useActiveWorkoutStore.getState();
    startWorkout({ userId: 'user-123' });
    addExercise({ exerciseId: 'ex-1', exerciseName: 'Bench Press' });
    addCardioBlock({
      exerciseId: 'ex-run',
      exerciseName: 'Running',
      cardio: { durationSeconds: 600 },
    });

    const state1 = useActiveWorkoutStore.getState();
    expect(state1.activeWorkout?.blocks.length).toBe(2);
    const cardioBlock = state1.activeWorkout?.blocks.find((b) => b.kind === 'cardio');
    if (cardioBlock) {
      removeBlock(cardioBlock.id);
      const state2 = useActiveWorkoutStore.getState();
      expect(state2.activeWorkout?.blocks.length).toBe(1);
      expect(state2.activeWorkout?.blocks[0]?.kind).toBe('straight');
    }
  });

  it('addCardioBlock + finishWorkout: totalVolume = 0 from cardio (G-13, cardio contributes 0)', async () => {
    const { startWorkout, addCardioBlock, finishWorkout } = useActiveWorkoutStore.getState();
    startWorkout({ userId: 'user-123' });
    addCardioBlock({
      exerciseId: 'ex-run',
      exerciseName: 'Running',
      cardio: { durationSeconds: 1800, distanceMeters: 5000, calories: 300 },
    });

    const result = await finishWorkout();
    expect(result).toBeTruthy();
    expect(result?.totalVolume).toBe(0);
  });

  it('addCardioBlock + straight set + finishWorkout: totalVolume = SUM from straight only (cardio = 0)', async () => {
    const { startWorkout, addExercise, addSet, updateSet, completeSet, addCardioBlock, finishWorkout } =
      useActiveWorkoutStore.getState();
    startWorkout({ userId: 'user-123' });
    addExercise({ exerciseId: 'ex-1', exerciseName: 'Squat' });
    addCardioBlock({
      exerciseId: 'ex-run',
      exerciseName: 'Running',
      cardio: { durationSeconds: 1800, calories: 300 },
    });

    const state1 = useActiveWorkoutStore.getState();
    const straightBlock = state1.activeWorkout?.blocks.find((b) => b.kind === 'straight');
    if (straightBlock?.kind === 'straight') {
      const entryId = straightBlock.exercises[0].id;
      addSet(entryId);

      const state2 = useActiveWorkoutStore.getState();
      const block2 = state2.activeWorkout?.blocks.find((b) => b.kind === 'straight');
      if (block2?.kind === 'straight') {
        const setId = block2.exercises[0].sets[0].id;
        updateSet(entryId, setId, { weight: 100, reps: 10 });
        completeSet(entryId, setId);

        const result = await finishWorkout();
        expect(result).toBeTruthy();
        expect(result?.totalVolume).toBe(1000); // 100*10 from straight, 0 from cardio
      }
    }
  });

  it('all ids are uuid v4 (G-10); finishWorkout still round-trips via toRow/fromRow', async () => {
    const { startWorkout, addCardioBlock, finishWorkout } = useActiveWorkoutStore.getState();
    startWorkout({ userId: 'user-123' });
    addCardioBlock({
      exerciseId: 'ex-run',
      exerciseName: 'Running',
      cardio: { durationSeconds: 600 },
    });

    const state = useActiveWorkoutStore.getState();
    const block = state.activeWorkout?.blocks[0];
    if (block?.kind === 'cardio') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
      expect(block.id).toMatch(uuidRegex);
      expect(state.activeWorkout?.id).toMatch(uuidRegex);
    }

    const result = await finishWorkout();
    expect(result).toBeTruthy();
    expect(result?.blocks.length).toBe(1);
    expect(result?.blocks[0]?.kind).toBe('cardio');
  });
});
