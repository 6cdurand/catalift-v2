import { describe, it, expect } from 'vitest';
import { summarizeBlocks, blocksToMemorySnapshots, computeSummaryData } from '../lib/summarize-blocks';
import type { WorkoutBlock, LoggedWorkout } from '../types';

function makeStraightBlock(): WorkoutBlock {
  return {
    id: 'b1',
    kind: 'straight',
    blockType: 'strength',
    exercises: [
      {
        id: 'e1',
        exerciseId: 'bench-press',
        exerciseName: 'Bench Press',
        sets: [
          { id: 's1', setNumber: 1, weight: 80, reps: 10, completed: true },
          { id: 's2', setNumber: 2, weight: 85, reps: 8, completed: true },
          { id: 's3', setNumber: 3, weight: 90, reps: 5, completed: false },
        ],
      },
    ],
  };
}

function makeCardioBlock(): WorkoutBlock {
  return {
    id: 'b2',
    kind: 'cardio',
    exerciseId: 'running',
    exerciseName: 'Run',
    cardio: {
      durationSeconds: 1200,
      distanceMeters: 5000,
    },
  };
}

function makeCircuitBlock(): WorkoutBlock {
  return {
    id: 'b3',
    kind: 'circuit',
    rounds: 3,
    stations: [
      {
        id: 'st1',
        exerciseId: 'burpee',
        exerciseName: 'Burpees',
        sets: [
          { id: 'cs1', setNumber: 1, weight: null, reps: 15, completed: true, roundIndex: 0, stationIndex: 0 },
          { id: 'cs2', setNumber: 2, weight: null, reps: 15, completed: true, roundIndex: 1, stationIndex: 0 },
          { id: 'cs3', setNumber: 3, weight: null, reps: 15, completed: true, roundIndex: 2, stationIndex: 0 },
        ],
      },
      {
        id: 'st2',
        exerciseId: 'squat',
        exerciseName: 'Squats',
        sets: [
          { id: 'cs4', setNumber: 1, weight: null, reps: 20, completed: true, roundIndex: 0, stationIndex: 1 },
          { id: 'cs5', setNumber: 2, weight: null, reps: 20, completed: true, roundIndex: 1, stationIndex: 1 },
          { id: 'cs6', setNumber: 3, weight: null, reps: 20, completed: false, roundIndex: 2, stationIndex: 1 },
        ],
      },
    ],
  };
}

describe('summarizeBlocks', () => {
  it('returns empty summary for no blocks', () => {
    const s = summarizeBlocks([]);
    expect(s.cardio).toEqual([]);
    expect(s.circuit).toEqual([]);
    expect(s.warmupCount).toBe(0);
    expect(s.hasNonStrengthWork).toBe(false);
  });

  it('summarizes cardio blocks', () => {
    const s = summarizeBlocks([makeCardioBlock()]);
    expect(s.cardio).toHaveLength(1);
    expect(s.cardio[0].activity).toBe('Run');
    expect(s.cardio[0].distanceMeters).toBe(5000);
    expect(s.cardio[0].seconds).toBe(1200);
    expect(s.totalCardioDistanceKm).toBeCloseTo(5);
    expect(s.totalCardioMinutes).toBeCloseTo(20);
    expect(s.hasNonStrengthWork).toBe(true);
  });

  it('summarizes circuit blocks', () => {
    const s = summarizeBlocks([makeCircuitBlock()]);
    expect(s.circuit).toHaveLength(1);
    expect(s.circuit[0].roundsCompleted).toBe(3);
    expect(s.circuit[0].roundsTarget).toBe(3);
    expect(s.circuit[0].completed).toBe(true);
    expect(s.totalCircuitRounds).toBe(3);
    expect(s.hasNonStrengthWork).toBe(true);
  });

  it('handles mixed blocks', () => {
    const s = summarizeBlocks([makeStraightBlock(), makeCardioBlock(), makeCircuitBlock()]);
    expect(s.cardio).toHaveLength(1);
    expect(s.circuit).toHaveLength(1);
    expect(s.hasNonStrengthWork).toBe(true);
  });
});

describe('blocksToMemorySnapshots', () => {
  it('returns snapshots for cardio and circuit only', () => {
    const snaps = blocksToMemorySnapshots([makeStraightBlock(), makeCardioBlock(), makeCircuitBlock()]);
    expect(snaps).toHaveLength(2);
    expect(snaps[0].type).toBe('cardio');
    expect(snaps[1].type).toBe('circuit');
  });

  it('cardio snapshot has distance and duration', () => {
    const snaps = blocksToMemorySnapshots([makeCardioBlock()]);
    expect(snaps[0].distanceCompleted).toBe(5000);
    expect(snaps[0].timerSeconds).toBe(1200);
    expect(snaps[0].cardioActivity).toBe('Run');
  });

  it('circuit snapshot has rounds data', () => {
    const snaps = blocksToMemorySnapshots([makeCircuitBlock()]);
    expect(snaps[0].rounds).toBe(3);
    expect(snaps[0].roundsCompleted).toBe(3);
    expect(snaps[0].completed).toBe(true);
  });
});

describe('computeSummaryData', () => {
  it('computes full summary from workout + duration', () => {
    const workout: LoggedWorkout = {
      id: 'w1',
      userId: 'u1',
      name: 'Test Workout',
      performedAt: '2026-01-01T10:00:00.000Z',
      blocks: [makeStraightBlock(), makeCardioBlock()],
      totalVolume: 1700,
    };
    const data = computeSummaryData(workout, 1800);
    expect(data.id).toBe('w1');
    expect(data.name).toBe('Test Workout');
    expect(data.duration).toBe(1800);
    expect(data.exercises).toBe(1); // straight block only
    expect(data.sets).toBe(2); // 2 completed sets
    expect(data.totalVolume).toBe(1700);
    expect(data.blocksSummary.cardio).toHaveLength(1);
    expect(data.blocksSummary.hasNonStrengthWork).toBe(true);
    expect(data.startTime).toBe('2026-01-01T10:00:00.000Z');
    expect(data.endTime).toBe('2026-01-01T10:30:00.000Z');
  });

  it('handles workout with null name', () => {
    const workout: LoggedWorkout = {
      id: 'w2',
      userId: 'u1',
      name: null,
      performedAt: '2026-01-01T10:00:00.000Z',
      blocks: [],
      totalVolume: 0,
    };
    const data = computeSummaryData(workout, 600);
    expect(data.name).toBe('Workout');
  });
});
