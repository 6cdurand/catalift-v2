// v1-parity: a straight block is a TYPED, multi-exercise container. `addBlock(type)`
// creates an empty typed block and makes it active; `addExercise` appends into the active
// block (inheriting blockType — no prompt). A bare `addExercise` with no active straight
// block falls back to creating a default 'strength' block. These lock the core grouping
// behaviour that PR #82/#83 regressed by treating straight = single exercise.

import { describe, it, expect, beforeEach } from 'vitest';
import { useActiveWorkoutStore } from '../active-workout-store';

beforeEach(() => {
  useActiveWorkoutStore.setState({
    activeWorkout: null,
    activeBlockId: null,
    previousByExerciseId: {},
  });
});

describe('active-workout-store — v1-parity typed multi-exercise straight blocks', () => {
  it('addBlock creates an empty typed straight block and makes it active', () => {
    const { startWorkout, addBlock } = useActiveWorkoutStore.getState();
    startWorkout({ userId: 'u1' });
    addBlock('warmup');

    const state = useActiveWorkoutStore.getState();
    expect(state.activeWorkout?.blocks).toHaveLength(1);
    const block = state.activeWorkout!.blocks[0];
    expect(block.kind).toBe('straight');
    if (block.kind !== 'straight') throw new Error('expected straight');
    expect(block.blockType).toBe('warmup');
    expect(block.exercises).toHaveLength(0);
    expect(state.activeBlockId).toBe(block.id);
  });

  it('addBlock then addExercise twice → ONE straight block with 2 exercises inheriting blockType', () => {
    const { startWorkout, addBlock, addExercise } = useActiveWorkoutStore.getState();
    startWorkout({ userId: 'u1' });
    addBlock('strength');
    addExercise({ exerciseId: 'bench', exerciseName: 'Bench Press' });
    addExercise({ exerciseId: 'row', exerciseName: 'Row' });

    const state = useActiveWorkoutStore.getState();
    expect(state.activeWorkout?.blocks).toHaveLength(1);
    const block = state.activeWorkout!.blocks[0];
    if (block.kind !== 'straight') throw new Error('expected straight');
    expect(block.blockType).toBe('strength');
    expect(block.exercises.map((e) => e.exerciseName)).toEqual(['Bench Press', 'Row']);
  });

  it('addExercise with no active block → creates a default strength block to hold it', () => {
    const { startWorkout, addExercise } = useActiveWorkoutStore.getState();
    startWorkout({ userId: 'u1' });
    addExercise({ exerciseId: 'squat', exerciseName: 'Squat' });

    const state = useActiveWorkoutStore.getState();
    expect(state.activeWorkout?.blocks).toHaveLength(1);
    const block = state.activeWorkout!.blocks[0];
    if (block.kind !== 'straight') throw new Error('expected straight');
    expect(block.blockType).toBe('strength');
    expect(block.exercises).toHaveLength(1);
    expect(block.exercises[0].exerciseName).toBe('Squat');
  });

  it('setActiveBlock retargets addExercise into an existing block (in-block add, no new block)', () => {
    const { startWorkout, addBlock, addExercise, setActiveBlock } = useActiveWorkoutStore.getState();
    startWorkout({ userId: 'u1' });
    addBlock('strength'); // block A (active)
    const blockAId = useActiveWorkoutStore.getState().activeBlockId!;
    addExercise({ exerciseId: 'bench', exerciseName: 'Bench Press' });
    addBlock('warmup'); // block B (now active)
    addExercise({ exerciseId: 'jj', exerciseName: 'Jumping Jacks' });

    // Re-target block A and add a second exercise into it.
    setActiveBlock(blockAId);
    addExercise({ exerciseId: 'row', exerciseName: 'Row' });

    const state = useActiveWorkoutStore.getState();
    expect(state.activeWorkout?.blocks).toHaveLength(2);
    const blockA = state.activeWorkout!.blocks.find((b) => b.id === blockAId);
    if (!blockA || blockA.kind !== 'straight') throw new Error('expected straight block A');
    expect(blockA.exercises.map((e) => e.exerciseName)).toEqual(['Bench Press', 'Row']);
  });

  it('setWorkoutNotes writes the header note onto the active workout', () => {
    const { startWorkout, setWorkoutNotes } = useActiveWorkoutStore.getState();
    startWorkout({ userId: 'u1' });
    setWorkoutNotes('felt strong today');
    expect(useActiveWorkoutStore.getState().activeWorkout?.notes).toBe('felt strong today');
  });
});
