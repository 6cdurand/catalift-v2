// Unit tests for active-workout-store w2b: superset + circuit block actions (w2b)

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useActiveWorkoutStore, entriesOfBlock } from '../active-workout-store';
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

describe('active-workout-store w2b — superset + circuit', () => {
  beforeEach(() => {
    useActiveWorkoutStore.setState({
      activeWorkout: null,
      workoutTimerSeconds: 0,
      timerRunning: false,
      isFinishing: false,
      hasHydrated: true,
    });
  });

  // ── addSupersetBlock ──

  it('addSupersetBlock creates a superset block with ≥2 entries, each a uuid id', () => {
    startWorkout();
    useActiveWorkoutStore.getState().addSupersetBlock([
      { exerciseId: 'ex-1', exerciseName: 'Bench Press' },
      { exerciseId: 'ex-2', exerciseName: 'Row' },
    ]);

    const blocks = getBlocks();
    expect(blocks).toHaveLength(1);
    const block = blocks[0];
    expect(block.kind).toBe('superset');
    if (block.kind === 'superset') {
      expect(block.id).toMatch(uuidRegex);
      expect(block.exercises).toHaveLength(2);
      for (const ex of block.exercises) {
        expect(ex.id).toMatch(uuidRegex);
        expect(ex.sets).toEqual([]);
      }
    }
  });

  it('addSupersetBlock with <2 exercises is a no-op', () => {
    startWorkout();
    useActiveWorkoutStore.getState().addSupersetBlock([
      { exerciseId: 'ex-1', exerciseName: 'Bench' },
    ]);
    expect(getBlocks()).toHaveLength(0);
  });

  // ── addCircuitBlock ──

  it('addCircuitBlock creates a circuit with N rounds + the given stations', () => {
    startWorkout();
    useActiveWorkoutStore.getState().addCircuitBlock({
      stations: [
        { exerciseId: 'ex-1', exerciseName: 'Squat' },
        { exerciseId: 'ex-2', exerciseName: 'Press' },
        { exerciseId: 'ex-3', exerciseName: 'Row' },
      ],
      rounds: 3,
      restSeconds: 30,
    });

    const blocks = getBlocks();
    expect(blocks).toHaveLength(1);
    const block = blocks[0];
    expect(block.kind).toBe('circuit');
    if (block.kind === 'circuit') {
      expect(block.id).toMatch(uuidRegex);
      expect(block.rounds).toBe(3);
      expect(block.restSeconds).toBe(30);
      expect(block.stations).toHaveLength(3);
      for (const st of block.stations) {
        expect(st.id).toMatch(uuidRegex);
        expect(st.sets).toEqual([]);
      }
    }
  });

  // ── mapEntry: set actions work on superset entries ──

  it('addSet/updateSet/completeSet/removeSet work on an entry INSIDE a superset', () => {
    startWorkout();
    useActiveWorkoutStore.getState().addSupersetBlock([
      { exerciseId: 'ex-1', exerciseName: 'Bench' },
      { exerciseId: 'ex-2', exerciseName: 'Row' },
    ]);

    const block = getBlocks()[0];
    if (block.kind !== 'superset') return;
    const entryId = block.exercises[0].id;

    // addSet
    useActiveWorkoutStore.getState().addSet(entryId);
    const block2 = getBlocks()[0];
    if (block2.kind !== 'superset') return;
    expect(block2.exercises[0].sets).toHaveLength(1);
    const setId = block2.exercises[0].sets[0].id;

    // updateSet
    useActiveWorkoutStore.getState().updateSet(entryId, setId, { weight: 50, reps: 10 });
    const block3 = getBlocks()[0];
    if (block3.kind !== 'superset') return;
    expect(block3.exercises[0].sets[0].weight).toBe(50);
    expect(block3.exercises[0].sets[0].reps).toBe(10);

    // completeSet
    useActiveWorkoutStore.getState().completeSet(entryId, setId);
    const block4 = getBlocks()[0];
    if (block4.kind !== 'superset') return;
    expect(block4.exercises[0].sets[0].completed).toBe(true);

    // uncompleteSet
    useActiveWorkoutStore.getState().uncompleteSet(entryId, setId);
    const block5 = getBlocks()[0];
    if (block5.kind !== 'superset') return;
    expect(block5.exercises[0].sets[0].completed).toBe(false);

    // removeSet
    useActiveWorkoutStore.getState().removeSet(entryId, setId);
    const block6 = getBlocks()[0];
    if (block6.kind !== 'superset') return;
    expect(block6.exercises[0].sets).toHaveLength(0);
  });

  // ── mapEntry: set actions work on circuit station entries ──

  it('addSet/updateSet/completeSet work on an entry INSIDE a circuit station', () => {
    startWorkout();
    useActiveWorkoutStore.getState().addCircuitBlock({
      stations: [
        { exerciseId: 'ex-1', exerciseName: 'Squat' },
        { exerciseId: 'ex-2', exerciseName: 'Press' },
      ],
      rounds: 2,
    });

    const block = getBlocks()[0];
    if (block.kind !== 'circuit') return;
    const stationId = block.stations[0].id;

    useActiveWorkoutStore.getState().addSet(stationId);
    const block2 = getBlocks()[0];
    if (block2.kind !== 'circuit') return;
    expect(block2.stations[0].sets).toHaveLength(1);
    const setId = block2.stations[0].sets[0].id;

    useActiveWorkoutStore.getState().updateSet(stationId, setId, { weight: 60, reps: 5 });
    useActiveWorkoutStore.getState().completeSet(stationId, setId);
    const block3 = getBlocks()[0];
    if (block3.kind !== 'circuit') return;
    expect(block3.stations[0].sets[0].completed).toBe(true);
    expect(block3.stations[0].sets[0].weight).toBe(60);
  });

  // ── straight-block set actions unchanged (w2a regression) ──

  it('straight-block set actions are UNCHANGED (w2a tests still green)', () => {
    startWorkout();
    useActiveWorkoutStore.getState().addExercise({ exerciseId: 'ex-1', exerciseName: 'Squat' });

    const block = getBlocks()[0];
    if (block?.kind !== 'straight') return;
    const entryId = block.exercises[0].id;

    useActiveWorkoutStore.getState().addSet(entryId);
    const block2 = getBlocks()[0];
    if (block2?.kind !== 'straight') return;
    expect(block2.exercises[0].sets).toHaveLength(1);
    expect(block2.exercises[0].sets[0].setNumber).toBe(1);
    expect(block2.exercises[0].sets[0].completed).toBe(false);
  });

  // ── addRound ──

  it('addRound appends one set to EVERY station with correct roundIndex/stationIndex/setNumber', () => {
    startWorkout();
    useActiveWorkoutStore.getState().addCircuitBlock({
      stations: [
        { exerciseId: 'ex-1', exerciseName: 'Squat' },
        { exerciseId: 'ex-2', exerciseName: 'Press' },
      ],
      rounds: 3,
    });

    const block = getBlocks()[0];
    if (block.kind !== 'circuit') return;
    const circuitId = block.id;

    // First round (roundIndex 0)
    useActiveWorkoutStore.getState().addRound(circuitId);
    const block2 = getBlocks()[0];
    if (block2.kind !== 'circuit') return;
    expect(block2.stations[0].sets).toHaveLength(1);
    expect(block2.stations[1].sets).toHaveLength(1);
    expect(block2.stations[0].sets[0].roundIndex).toBe(0);
    expect(block2.stations[0].sets[0].stationIndex).toBe(0);
    expect(block2.stations[1].sets[0].stationIndex).toBe(1);
    expect(block2.stations[0].sets[0].setNumber).toBe(1);
    expect(block2.stations[0].sets[0].id).toMatch(uuidRegex);

    // Second round (roundIndex 1)
    useActiveWorkoutStore.getState().addRound(circuitId);
    const block3 = getBlocks()[0];
    if (block3.kind !== 'circuit') return;
    expect(block3.stations[0].sets).toHaveLength(2);
    expect(block3.stations[0].sets[1].roundIndex).toBe(1);
    expect(block3.stations[0].sets[1].setNumber).toBe(2);
  });

  it('addRound carries weight/reps from the station last set', () => {
    startWorkout();
    useActiveWorkoutStore.getState().addCircuitBlock({
      stations: [{ exerciseId: 'ex-1', exerciseName: 'Squat' }],
      rounds: 2,
    });

    const block = getBlocks()[0];
    if (block.kind !== 'circuit') return;
    const circuitId = block.id;
    const stationId = block.stations[0].id;

    // First round
    useActiveWorkoutStore.getState().addRound(circuitId);
    const block2 = getBlocks()[0];
    if (block2.kind !== 'circuit') return;
    const setId = block2.stations[0].sets[0].id;
    useActiveWorkoutStore.getState().updateSet(stationId, setId, { weight: 80, reps: 8 });

    // Second round should carry 80/8
    useActiveWorkoutStore.getState().addRound(circuitId);
    const block3 = getBlocks()[0];
    if (block3.kind !== 'circuit') return;
    expect(block3.stations[0].sets[1].weight).toBe(80);
    expect(block3.stations[0].sets[1].reps).toBe(8);
  });

  // ── removeExercise on superset/circuit ──

  it('removeExercise drops an entry from a superset; empties → block removed', () => {
    startWorkout();
    useActiveWorkoutStore.getState().addSupersetBlock([
      { exerciseId: 'ex-1', exerciseName: 'Bench' },
      { exerciseId: 'ex-2', exerciseName: 'Row' },
    ]);

    const block = getBlocks()[0];
    if (block.kind !== 'superset') return;
    const entryId = block.exercises[0].id;

    // Remove one → still 1 entry, block stays
    useActiveWorkoutStore.getState().removeExercise(entryId);
    const block2 = getBlocks()[0];
    if (block2.kind !== 'superset') return;
    expect(block2.exercises).toHaveLength(1);

    // Remove the last → block removed
    useActiveWorkoutStore.getState().removeExercise(block2.exercises[0].id);
    expect(getBlocks()).toHaveLength(0);
  });

  it('removeExercise drops a station from a circuit; empties → block removed', () => {
    startWorkout();
    useActiveWorkoutStore.getState().addCircuitBlock({
      stations: [{ exerciseId: 'ex-1', exerciseName: 'Squat' }],
      rounds: 1,
    });

    const block = getBlocks()[0];
    if (block.kind !== 'circuit') return;
    useActiveWorkoutStore.getState().removeExercise(block.stations[0].id);
    expect(getBlocks()).toHaveLength(0);
  });

  // ── removeBlock ──

  it('removeBlock removes the whole superset', () => {
    startWorkout();
    useActiveWorkoutStore.getState().addSupersetBlock([
      { exerciseId: 'ex-1', exerciseName: 'Bench' },
      { exerciseId: 'ex-2', exerciseName: 'Row' },
    ]);

    const block = getBlocks()[0];
    useActiveWorkoutStore.getState().removeBlock(block.id);
    expect(getBlocks()).toHaveLength(0);
  });

  it('removeBlock removes the whole circuit', () => {
    startWorkout();
    useActiveWorkoutStore.getState().addCircuitBlock({
      stations: [{ exerciseId: 'ex-1', exerciseName: 'Squat' }],
      rounds: 2,
    });

    const block = getBlocks()[0];
    useActiveWorkoutStore.getState().removeBlock(block.id);
    expect(getBlocks()).toHaveLength(0);
  });

  // ── computeTotalVolume SUMs across all blocks (G-13) ──

  it('computeTotalVolume SUMs completed sets across superset.exercises + circuit.stations (G-13, never MAX)', async () => {
    startWorkout();

    // Straight block: 100×10 = 1000
    useActiveWorkoutStore.getState().addExercise({ exerciseId: 'ex-1', exerciseName: 'Squat' });
    const sBlock = getBlocks()[0];
    if (sBlock?.kind !== 'straight') return;
    const sId = sBlock.exercises[0].id;
    useActiveWorkoutStore.getState().addSet(sId);
    const sBlock2 = getBlocks()[0];
    if (sBlock2?.kind !== 'straight') return;
    const sSetId = sBlock2.exercises[0].sets[0].id;
    useActiveWorkoutStore.getState().updateSet(sId, sSetId, { weight: 100, reps: 10 });
    useActiveWorkoutStore.getState().completeSet(sId, sSetId);

    // Superset: 50×5 + 40×5 = 450
    useActiveWorkoutStore.getState().addSupersetBlock([
      { exerciseId: 'ex-2', exerciseName: 'Bench' },
      { exerciseId: 'ex-3', exerciseName: 'Row' },
    ]);
    const ssBlock = getBlocks().find((b) => b.kind === 'superset');
    if (ssBlock?.kind !== 'superset') return;
    for (const ex of ssBlock.exercises) {
      useActiveWorkoutStore.getState().addSet(ex.id);
    }
    const ssBlock2 = getBlocks().find((b) => b.kind === 'superset');
    if (ssBlock2?.kind !== 'superset') return;
    useActiveWorkoutStore.getState().updateSet(ssBlock2.exercises[0].id, ssBlock2.exercises[0].sets[0].id, { weight: 50, reps: 5 });
    useActiveWorkoutStore.getState().completeSet(ssBlock2.exercises[0].id, ssBlock2.exercises[0].sets[0].id);
    useActiveWorkoutStore.getState().updateSet(ssBlock2.exercises[1].id, ssBlock2.exercises[1].sets[0].id, { weight: 40, reps: 5 });
    useActiveWorkoutStore.getState().completeSet(ssBlock2.exercises[1].id, ssBlock2.exercises[1].sets[0].id);

    // Circuit: 60×3 = 180
    useActiveWorkoutStore.getState().addCircuitBlock({
      stations: [{ exerciseId: 'ex-4', exerciseName: 'Lunge' }],
      rounds: 1,
    });
    const cBlock = getBlocks().find((b) => b.kind === 'circuit');
    if (cBlock?.kind !== 'circuit') return;
    useActiveWorkoutStore.getState().addRound(cBlock.id);
    const cBlock2 = getBlocks().find((b) => b.kind === 'circuit');
    if (cBlock2?.kind !== 'circuit') return;
    const cSetId = cBlock2.stations[0].sets[0].id;
    useActiveWorkoutStore.getState().updateSet(cBlock2.stations[0].id, cSetId, { weight: 60, reps: 3 });
    useActiveWorkoutStore.getState().completeSet(cBlock2.stations[0].id, cSetId);

    // Total = 1000 + 450 + 180 = 1630
    const result = await useActiveWorkoutStore.getState().finishWorkout();
    expect(result).toBeTruthy();
    expect(result?.totalVolume).toBe(1000 + 450 + 180);
  });

  // ── all ids are uuid v4 (G-10) ──

  it('all created ids in superset/circuit are valid uuid v4 (G-10)', () => {
    startWorkout();
    useActiveWorkoutStore.getState().addSupersetBlock([
      { exerciseId: 'ex-1', exerciseName: 'Bench' },
      { exerciseId: 'ex-2', exerciseName: 'Row' },
    ]);

    const ssBlock = getBlocks().find((b) => b.kind === 'superset');
    if (ssBlock?.kind !== 'superset') return;
    expect(ssBlock.id).toMatch(uuidRegex);
    for (const ex of ssBlock.exercises) {
      expect(ex.id).toMatch(uuidRegex);
    }

    useActiveWorkoutStore.getState().addCircuitBlock({
      stations: [{ exerciseId: 'ex-3', exerciseName: 'Squat' }],
      rounds: 1,
    });
    const cBlock = getBlocks().find((b) => b.kind === 'circuit');
    if (cBlock?.kind !== 'circuit') return;
    expect(cBlock.id).toMatch(uuidRegex);
    for (const st of cBlock.stations) {
      expect(st.id).toMatch(uuidRegex);
    }

    // Set ids
    useActiveWorkoutStore.getState().addSet(ssBlock.exercises[0].id);
    const ssBlock2 = getBlocks().find((b) => b.kind === 'superset');
    if (ssBlock2?.kind !== 'superset') return;
    expect(ssBlock2.exercises[0].sets[0].id).toMatch(uuidRegex);
  });

  // ── finishWorkout round-trips via toRow/fromRow ──

  it('finishWorkout still round-trips via toRow/fromRow with superset + circuit blocks', async () => {
    startWorkout();
    useActiveWorkoutStore.getState().addSupersetBlock([
      { exerciseId: 'ex-1', exerciseName: 'Bench' },
      { exerciseId: 'ex-2', exerciseName: 'Row' },
    ]);
    useActiveWorkoutStore.getState().addCircuitBlock({
      stations: [{ exerciseId: 'ex-3', exerciseName: 'Squat' }],
      rounds: 2,
    });

    const result = await useActiveWorkoutStore.getState().finishWorkout();
    expect(result).toBeTruthy();
    if (!result) return;

    const row = toRow(result);
    const restored = fromRow(row);

    expect(restored.blocks).toHaveLength(2);
    expect(restored.blocks[0].kind).toBe('superset');
    expect(restored.blocks[1].kind).toBe('circuit');
    if (restored.blocks[1].kind === 'circuit') {
      expect(restored.blocks[1].rounds).toBe(2);
    }
  });

  // ── entriesOfBlock helper ──

  it('entriesOfBlock returns correct entries for each block kind', () => {
    const straight: WorkoutBlock = {
      id: 'b1',
      kind: 'straight',
      blockType: 'strength',
      exercises: [{ id: 'e1', exerciseId: 'ex-1', exerciseName: 'Squat', sets: [] }],
    };
    expect(entriesOfBlock(straight)).toHaveLength(1);

    const superset: WorkoutBlock = {
      id: 'b2',
      kind: 'superset',
      exercises: [
        { id: 'e2', exerciseId: 'ex-2', exerciseName: 'Bench', sets: [] },
        { id: 'e3', exerciseId: 'ex-3', exerciseName: 'Row', sets: [] },
      ],
    };
    expect(entriesOfBlock(superset)).toHaveLength(2);

    const circuit: WorkoutBlock = {
      id: 'b3',
      kind: 'circuit',
      rounds: 3,
      stations: [{ id: 'e4', exerciseId: 'ex-4', exerciseName: 'Lunge', sets: [] }],
    };
    expect(entriesOfBlock(circuit)).toHaveLength(1);

    const cardio: WorkoutBlock = {
      id: 'b4',
      kind: 'cardio',
      exerciseId: 'ex-5',
      exerciseName: 'Run',
      cardio: { durationSeconds: 600 },
    };
    expect(entriesOfBlock(cardio)).toHaveLength(0);
  });
});
