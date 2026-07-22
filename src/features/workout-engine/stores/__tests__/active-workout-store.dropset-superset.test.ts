// Unit tests for the faithful v1 port of in-session interactions (BACKLOG #19):
//   • addDropSet / updateDrop / removeDrop  (v1 handleAddDropSet :1322 + set.drops :6383)
//   • createSuperset                        (v1 handleCreateSuperset :1336)
// Also asserts drop tonnage folds into finishWorkout totalVolume (G-13) and round-trips.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useActiveWorkoutStore } from '../active-workout-store';
import { fromRow, toRow } from '../../lib/serialize';
import type { WorkoutBlock } from '../../types';

vi.mock('../../api/persist', () => ({
  persist: vi.fn(async () => true),
}));

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function startWorkout() {
  useActiveWorkoutStore.getState().startWorkout({ userId: 'user-123' });
}

function getBlocks(): WorkoutBlock[] {
  return useActiveWorkoutStore.getState().activeWorkout?.blocks ?? [];
}

/** Add a straight exercise and return its entry id. */
function addStraight(exerciseId: string, exerciseName: string): string {
  useActiveWorkoutStore.getState().addExercise({ exerciseId, exerciseName });
  const block = getBlocks().find(
    (b) => b.kind === 'straight' && b.exercises[0]?.exerciseId === exerciseId,
  );
  if (block?.kind !== 'straight') throw new Error('straight block not found');
  return block.exercises[0].id;
}

describe('active-workout-store — drop sets (v1 :1322)', () => {
  beforeEach(() => {
    useActiveWorkoutStore.setState({
      activeWorkout: null,
      workoutTimerSeconds: 0,
      timerRunning: false,
      isFinishing: false,
      hasHydrated: true,
    });
  });

  it('addDropSet appends ONE drop (0/0, uuid id) to EVERY set of the exercise', () => {
    startWorkout();
    const entryId = addStraight('ex-1', 'Bench');
    const store = useActiveWorkoutStore.getState();
    store.addSet(entryId);
    store.addSet(entryId);

    store.addDropSet(entryId);

    const block = getBlocks()[0];
    if (block.kind !== 'straight') return;
    expect(block.exercises[0].sets).toHaveLength(2);
    for (const s of block.exercises[0].sets) {
      expect(s.drops).toHaveLength(1);
      expect(s.drops![0]).toMatchObject({ weight: 0, reps: 0 });
      expect(s.drops![0].id).toMatch(uuidRegex);
    }
  });

  it('addDropSet twice stacks a second drop on every set', () => {
    startWorkout();
    const entryId = addStraight('ex-1', 'Bench');
    const store = useActiveWorkoutStore.getState();
    store.addSet(entryId);

    store.addDropSet(entryId);
    store.addDropSet(entryId);

    const block = getBlocks()[0];
    if (block.kind !== 'straight') return;
    expect(block.exercises[0].sets[0].drops).toHaveLength(2);
  });

  it('addDropSet with no sets is a safe no-op (nothing to attach to)', () => {
    startWorkout();
    const entryId = addStraight('ex-1', 'Bench');
    useActiveWorkoutStore.getState().addDropSet(entryId);

    const block = getBlocks()[0];
    if (block.kind !== 'straight') return;
    expect(block.exercises[0].sets).toHaveLength(0);
  });

  it('updateDrop edits a single drop by id; removeDrop deletes it', () => {
    startWorkout();
    const entryId = addStraight('ex-1', 'Bench');
    const store = useActiveWorkoutStore.getState();
    store.addSet(entryId);
    store.addDropSet(entryId);

    let block = getBlocks()[0];
    if (block.kind !== 'straight') return;
    const setId = block.exercises[0].sets[0].id;
    const dropId = block.exercises[0].sets[0].drops![0].id;

    store.updateDrop(entryId, setId, dropId, { weight: 60, reps: 8 });
    block = getBlocks()[0];
    if (block.kind !== 'straight') return;
    expect(block.exercises[0].sets[0].drops![0]).toMatchObject({ weight: 60, reps: 8 });

    store.removeDrop(entryId, setId, dropId);
    block = getBlocks()[0];
    if (block.kind !== 'straight') return;
    expect(block.exercises[0].sets[0].drops).toHaveLength(0);
  });

  it('drop tonnage folds into finishWorkout totalVolume (G-13) and round-trips', async () => {
    startWorkout();
    const entryId = addStraight('ex-1', 'Bench');
    const store = useActiveWorkoutStore.getState();
    store.addSet(entryId);

    let block = getBlocks()[0];
    if (block.kind !== 'straight') return;
    const setId = block.exercises[0].sets[0].id;

    store.updateSet(entryId, setId, { weight: 100, reps: 5 }); // 500
    store.addDropSet(entryId);

    block = getBlocks()[0];
    if (block.kind !== 'straight') return;
    const dropId = block.exercises[0].sets[0].drops![0].id;
    store.updateDrop(entryId, setId, dropId, { weight: 60, reps: 8 }); // 480
    store.completeSet(entryId, setId);

    const result = await useActiveWorkoutStore.getState().finishWorkout();
    expect(result).toBeTruthy();
    expect(result?.totalVolume).toBe(500 + 480);

    // Write→read round-trip preserves drops (AC #6).
    const restored = fromRow(toRow(result!));
    const rb = restored.blocks[0];
    if (rb.kind !== 'straight') return;
    expect(rb.exercises[0].sets[0].drops).toHaveLength(1);
    expect(rb.exercises[0].sets[0].drops![0]).toMatchObject({ weight: 60, reps: 8 });
  });
});

describe('active-workout-store — createSuperset (v1 :1336)', () => {
  beforeEach(() => {
    useActiveWorkoutStore.setState({
      activeWorkout: null,
      workoutTimerSeconds: 0,
      timerRunning: false,
      isFinishing: false,
      hasHydrated: true,
    });
  });

  it('merges two straight blocks into one superset (A1/A2), source position kept', () => {
    startWorkout();
    const srcId = addStraight('ex-1', 'Bench');
    const tgtId = addStraight('ex-2', 'Row');
    addStraight('ex-3', 'Squat'); // untouched trailing block

    useActiveWorkoutStore.getState().createSuperset(srcId, tgtId);

    const blocks = getBlocks();
    expect(blocks).toHaveLength(2); // superset (was Bench slot) + Squat
    const ss = blocks[0];
    expect(ss.kind).toBe('superset');
    if (ss.kind === 'superset') {
      expect(ss.id).toMatch(uuidRegex);
      expect(ss.exercises.map((e) => e.exerciseName)).toEqual(['Bench', 'Row']);
    }
    expect(blocks[1].kind).toBe('straight');
  });

  it('preserves already-logged sets from both source and target', () => {
    startWorkout();
    const srcId = addStraight('ex-1', 'Bench');
    const tgtId = addStraight('ex-2', 'Row');
    const store = useActiveWorkoutStore.getState();
    store.addSet(srcId);
    store.addSet(tgtId);

    store.createSuperset(srcId, tgtId);

    const ss = getBlocks()[0];
    if (ss.kind !== 'superset') return;
    expect(ss.exercises[0].sets).toHaveLength(1);
    expect(ss.exercises[1].sets).toHaveLength(1);
  });

  it('is a no-op when source === target', () => {
    startWorkout();
    const srcId = addStraight('ex-1', 'Bench');
    useActiveWorkoutStore.getState().createSuperset(srcId, srcId);
    expect(getBlocks()).toHaveLength(1);
    expect(getBlocks()[0].kind).toBe('straight');
  });

  it('is a no-op when an id is not a straight block', () => {
    startWorkout();
    const srcId = addStraight('ex-1', 'Bench');
    useActiveWorkoutStore.getState().createSuperset(srcId, 'nonexistent');
    expect(getBlocks()).toHaveLength(1);
    expect(getBlocks()[0].kind).toBe('straight');
  });

  it('resulting superset round-trips via toRow/fromRow (parity)', async () => {
    startWorkout();
    const srcId = addStraight('ex-1', 'Bench');
    const tgtId = addStraight('ex-2', 'Row');
    useActiveWorkoutStore.getState().createSuperset(srcId, tgtId);

    const result = await useActiveWorkoutStore.getState().finishWorkout();
    expect(result).toBeTruthy();
    const restored = fromRow(toRow(result!));
    expect(restored.blocks).toHaveLength(1);
    expect(restored.blocks[0].kind).toBe('superset');
  });
});
