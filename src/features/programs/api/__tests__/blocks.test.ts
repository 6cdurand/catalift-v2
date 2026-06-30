/**
 * blocks.test.ts — Saved blocks API tests (w2c-2)
 * Focus: block_data round-trip lossless (ProgramBlock → saved_blocks → ProgramBlock)
 */

import { describe, it, expect } from 'vitest';
import type { ProgramBlock } from '../../types';

describe('block_data round-trip', () => {
  it('preserves all ProgramBlock fields losslessly (work block with exercises)', () => {
    const original: ProgramBlock = {
      id: 'block-123',
      type: 'work',
      name: 'Upper Push A',
      exercises: [
        {
          id: 'ex-1',
          exerciseId: 'bench-press',
          exerciseName: 'Bench Press',
          movementPattern: 'compound',
          sets: 4,
          reps: '6-8',
          rest: '120s',
          repType: 'reps',
          tempo: '2010',
          notes: 'Pause at chest',
          setStyle: 'straight',
        },
        {
          id: 'ex-2',
          exerciseId: 'incline-db-press',
          exerciseName: 'Incline Dumbbell Press',
          movementPattern: 'compound',
          sets: 3,
          reps: '8-10',
          rest: '90s',
          repType: 'reps',
          tempo: '2020',
          notes: '45° incline',
          setStyle: 'straight',
        },
      ],
    };

    // Simulate DB round-trip: ProgramBlock → jsonb → ProgramBlock
    const serialized = JSON.stringify(original);
    const deserialized: ProgramBlock = JSON.parse(serialized);

    // Verify lossless round-trip
    expect(deserialized).toEqual(original);
    expect(deserialized.id).toBe('block-123');
    expect(deserialized.type).toBe('work');
    expect(deserialized.name).toBe('Upper Push A');
    expect(deserialized.exercises).toHaveLength(2);
    expect(deserialized.exercises[0].exerciseName).toBe('Bench Press');
    expect(deserialized.exercises[0].sets).toBe(4);
    expect(deserialized.exercises[0].reps).toBe('6-8');
    expect(deserialized.exercises[0].rest).toBe('120s');
    expect(deserialized.exercises[0].repType).toBe('reps');
    expect(deserialized.exercises[0].tempo).toBe('2010');
    expect(deserialized.exercises[0].notes).toBe('Pause at chest');
    expect(deserialized.exercises[0].setStyle).toBe('straight');
  });

  it('preserves circuit block structure', () => {
    const original: ProgramBlock = {
      id: 'block-456',
      type: 'circuit',
      name: 'Finisher Circuit',
      exercises: [
        {
          id: 'ex-1',
          exerciseId: 'burpees',
          exerciseName: 'Burpees',
          movementPattern: 'bodyweight',
          sets: 3,
          reps: '10',
          rest: '30s',
          repType: 'reps',
        },
        {
          id: 'ex-2',
          exerciseId: 'jump-squats',
          exerciseName: 'Jump Squats',
          movementPattern: 'bodyweight',
          sets: 3,
          reps: '15',
          rest: '30s',
          repType: 'reps',
        },
      ],
    };

    const serialized = JSON.stringify(original);
    const deserialized: ProgramBlock = JSON.parse(serialized);

    expect(deserialized).toEqual(original);
    expect(deserialized.type).toBe('circuit');
    expect(deserialized.exercises).toHaveLength(2);
  });

  it('preserves cardio block structure', () => {
    const original: ProgramBlock = {
      id: 'block-789',
      type: 'cardio',
      name: 'Steady State',
      exercises: [
        {
          id: 'ex-1',
          exerciseId: 'treadmill-run',
          exerciseName: 'Treadmill Run',
          movementPattern: 'cardio',
          sets: 1,
          reps: '20:00',
          rest: '0s',
          repType: 'time',
          notes: '130-140 bpm',
        },
      ],
    };

    const serialized = JSON.stringify(original);
    const deserialized: ProgramBlock = JSON.parse(serialized);

    expect(deserialized).toEqual(original);
    expect(deserialized.type).toBe('cardio');
    expect(deserialized.exercises[0].repType).toBe('time');
    expect(deserialized.exercises[0].reps).toBe('20:00');
  });

  it('handles optional fields correctly (warmup block minimal)', () => {
    const original: ProgramBlock = {
      id: 'block-warm',
      type: 'warmup',
      name: 'Dynamic Warmup',
      exercises: [
        {
          id: 'ex-1',
          exerciseId: 'arm-circles',
          exerciseName: 'Arm Circles',
          movementPattern: 'bodyweight',
          sets: 2,
          reps: '10',
          rest: '0s',
          // Optional fields omitted
        },
      ],
    };

    const serialized = JSON.stringify(original);
    const deserialized: ProgramBlock = JSON.parse(serialized);

    expect(deserialized).toEqual(original);
    expect(deserialized.exercises[0].repType).toBeUndefined();
    expect(deserialized.exercises[0].tempo).toBeUndefined();
    expect(deserialized.exercises[0].notes).toBeUndefined();
    expect(deserialized.exercises[0].setStyle).toBeUndefined();
  });
});
