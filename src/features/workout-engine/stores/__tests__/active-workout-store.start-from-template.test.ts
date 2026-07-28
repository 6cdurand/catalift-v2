// Unit tests for startFromTemplate + convertProgramDayToWorkoutBlocks (BUG-022)
// Verifies that seeding the active-workout store from a program day populates
// the correct blocks/exercises/sets, and that multi-exercise blocks (supersets)
// and circuit blocks survive the conversion.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useActiveWorkoutStore } from '../active-workout-store';
import { convertProgramDayToWorkoutBlocks } from '@/lib/programStartUtils';
// eslint-disable-next-line no-restricted-imports -- test needs ProgramDay type for fixture
import type { ProgramDay } from '@/features/programs/types';
import { entriesOfBlock } from '../active-workout-store';

// Mock persist (api/persist.ts)
vi.mock('../../api/persist', () => ({
  persist: vi.fn(async () => true),
}));

const OPTS = {
  programId: 'prog-1',
  dayIndex: 0,
  programName: 'Test Program',
  userId: 'user-123',
};

function makeProgramDay(overrides?: Partial<ProgramDay>): ProgramDay {
  return {
    id: 'day-1',
    label: 'Push',
    blocks: [
      {
        id: 'blk-warmup',
        type: 'warmup',
        name: 'Warm-up',
        exercises: [
          {
            id: 'ex-wu1',
            exerciseId: 'shoulder-press',
            exerciseName: 'Shoulder Press',
            movementPattern: 'compound',
            sets: 2,
            reps: '15',
            rest: '60s',
          },
        ],
      },
      {
        id: 'blk-main',
        type: 'work',
        name: 'Main',
        exercises: [
          {
            id: 'ex-bench',
            exerciseId: 'bench-press',
            exerciseName: 'Bench Press',
            movementPattern: 'compound',
            sets: 4,
            reps: '6-8',
            rest: '180s',
          },
          {
            id: 'ex-incline',
            exerciseId: 'incline-db-press',
            exerciseName: 'Incline DB Press',
            movementPattern: 'compound',
            sets: 3,
            reps: '10',
            rest: '120s',
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('BUG-022: startFromTemplate + convertProgramDayToWorkoutBlocks', () => {
  beforeEach(() => {
    useActiveWorkoutStore.setState({
      activeWorkout: null,
      workoutTimerSeconds: 0,
      timerRunning: false,
      isFinishing: false,
      hasHydrated: true,
    });
  });

  it('startFromTemplate creates a workout pre-populated with blocks', () => {
    const { startFromTemplate } = useActiveWorkoutStore.getState();
    startFromTemplate({
      userId: 'user-123',
      name: 'Push - Test Program',
      blocks: [
        {
          id: 'blk-1',
          kind: 'straight',
          blockType: 'strength',
          exercises: [
            {
              id: 'ex-1',
              exerciseId: 'bench-press',
              exerciseName: 'Bench Press',
              sets: [
                { id: 's1', setNumber: 1, weight: 0, reps: 8, completed: false },
                { id: 's2', setNumber: 2, weight: 0, reps: 8, completed: false },
              ],
            },
          ],
        },
      ],
    });

    const state = useActiveWorkoutStore.getState();
    expect(state.activeWorkout).toBeTruthy();
    expect(state.activeWorkout?.name).toBe('Push - Test Program');
    expect(state.activeWorkout?.blocks).toHaveLength(1);
    expect(state.activeWorkout?.blocks[0].kind).toBe('straight');
    expect(state.timerRunning).toBe(true);
  });

  it('convertProgramDayToWorkoutBlocks produces correct block count and kinds', () => {
    const day = makeProgramDay();
    const blocks = convertProgramDayToWorkoutBlocks(day, OPTS);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].kind).toBe('straight');
    expect(blocks[1].kind).toBe('straight');
  });

  it('populates exercises with correct names and set counts', () => {
    const day = makeProgramDay();
    const blocks = convertProgramDayToWorkoutBlocks(day, OPTS);

    // Block 0: warmup with 1 exercise, 2 sets
    const warmup = blocks[0];
    if (warmup.kind !== 'straight') throw new Error('expected straight block');
    expect(warmup.blockType).toBe('warmup');
    expect(warmup.exercises).toHaveLength(1);
    expect(warmup.exercises[0].exerciseName).toBe('Shoulder Press');
    expect(warmup.exercises[0].sets).toHaveLength(2);
    expect(warmup.exercises[0].sets[0].setNumber).toBe(1);
    expect(warmup.exercises[0].sets[0].completed).toBe(false);

    // Block 1: work with 2 exercises (superset-equivalent), 4 and 3 sets
    const main = blocks[1];
    if (main.kind !== 'straight') throw new Error('expected straight block');
    expect(main.blockType).toBe('strength');
    expect(main.exercises).toHaveLength(2);
    expect(main.exercises[0].exerciseName).toBe('Bench Press');
    expect(main.exercises[0].sets).toHaveLength(4);
    expect(main.exercises[1].exerciseName).toBe('Incline DB Press');
    expect(main.exercises[1].sets).toHaveLength(3);
  });

  it('preserves multi-exercise blocks (superset structure survives)', () => {
    const day = makeProgramDay();
    const blocks = convertProgramDayToWorkoutBlocks(day, OPTS);

    // The "work" block has 2 exercises — they must stay in the SAME block
    const main = blocks[1];
    if (main.kind !== 'straight') throw new Error('expected straight block');
    expect(main.exercises).toHaveLength(2);
    expect(main.exercises.map((e) => e.exerciseName)).toEqual([
      'Bench Press',
      'Incline DB Press',
    ]);
  });

  it('preserves pyramid rep structure (arrow-separated reps)', () => {
    const day: ProgramDay = {
      id: 'day-pyramid',
      label: 'Strength',
      blocks: [
        {
          id: 'blk-pyr',
          type: 'work',
          name: 'Pyramid',
          exercises: [
            {
              id: 'ex-squat',
              exerciseId: 'squat',
              exerciseName: 'Squat',
              movementPattern: 'compound',
              sets: 4,
              reps: '12→10→8→6',
              rest: '180s',
            },
          ],
        },
      ],
    };

    const blocks = convertProgramDayToWorkoutBlocks(day, OPTS);
    const block = blocks[0];
    if (block.kind !== 'straight') throw new Error('expected straight block');
    const sets = block.exercises[0].sets;
    expect(sets).toHaveLength(4);
    expect(sets[0].reps).toBe(12);
    expect(sets[1].reps).toBe(10);
    expect(sets[2].reps).toBe(8);
    expect(sets[3].reps).toBe(6);
  });

  it('converts circuit blocks with rounds and stations', () => {
    const day: ProgramDay = {
      id: 'day-circuit',
      label: 'Conditioning',
      blocks: [
        {
          id: 'blk-circuit',
          type: 'circuit',
          name: 'Metcon',
          exercises: [
            {
              id: 'ex-kb',
              exerciseId: 'kb-swing',
              exerciseName: 'KB Swing',
              movementPattern: 'compound',
              sets: 1,
              reps: '15',
              rest: '30s',
            },
            {
              id: 'ex-burpee',
              exerciseId: 'burpee',
              exerciseName: 'Burpee',
              movementPattern: 'bodyweight',
              sets: 1,
              reps: '10',
              rest: '30s',
            },
          ],
          // Extra metadata stored in the program JSON (not on the ProgramBlock type)
          ...({ circuitRounds: 3, circuitRestBetween: 30 } as Record<string, unknown>),
        } as never,
      ],
    };

    const blocks = convertProgramDayToWorkoutBlocks(day, OPTS);
    expect(blocks).toHaveLength(1);
    const circuit = blocks[0];
    if (circuit.kind !== 'circuit') throw new Error('expected circuit block');
    expect(circuit.rounds).toBe(3);
    expect(circuit.stations).toHaveLength(2);
    expect(circuit.stations[0].exerciseName).toBe('KB Swing');
    expect(circuit.stations[1].exerciseName).toBe('Burpee');
    expect(circuit.restSeconds).toBe(30);
  });

  it('startFromTemplate + convertProgramDayToWorkoutBlocks end-to-end: store has all exercises', () => {
    const day = makeProgramDay();
    const blocks = convertProgramDayToWorkoutBlocks(day, OPTS);

    const { startFromTemplate } = useActiveWorkoutStore.getState();
    startFromTemplate({
      userId: 'user-123',
      name: 'Push - Test Program',
      blocks,
    });

    const state = useActiveWorkoutStore.getState();
    expect(state.activeWorkout).toBeTruthy();
    expect(state.activeWorkout?.blocks).toHaveLength(2);

    // Total exercises across all blocks = 1 (warmup) + 2 (main) = 3
    const allEntries = state.activeWorkout!.blocks.flatMap(entriesOfBlock);
    expect(allEntries).toHaveLength(3);
    expect(allEntries.map((e) => e.exerciseName)).toEqual([
      'Shoulder Press',
      'Bench Press',
      'Incline DB Press',
    ]);

    // Total sets = 2 + 4 + 3 = 9
    const totalSets = allEntries.reduce((sum, e) => sum + e.sets.length, 0);
    expect(totalSets).toBe(9);
  });

  it('does not clobber: startFromTemplate overwrites empty store but existing workout is checked by caller', () => {
    // The store action itself always sets — the "don't clobber" guard is in
    // handleStart (caller). Here we verify the action works on an empty store.
    const { startFromTemplate } = useActiveWorkoutStore.getState();
    startFromTemplate({
      userId: 'user-123',
      blocks: [],
    });
    expect(useActiveWorkoutStore.getState().activeWorkout).toBeTruthy();
    expect(useActiveWorkoutStore.getState().activeWorkout?.blocks).toEqual([]);
  });
});
