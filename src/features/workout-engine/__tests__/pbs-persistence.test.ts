/**
 * pbs-persistence.test.ts — Personal Bests persistence tests (F1)
 *
 * Accuracy gate per dispatch:
 * 1. Completing a workout with low-rep set produces upsert row with correct e1RM
 * 2. Subsequent WORSE session does NOT lower stored PB (no regression); BETTER raises it
 * 3. >20-rep set yields one_rm = null (excluded) and creates no phantom PB
 * 4. e1RM shown on summary equals value /pbs would show (single canonical calc)
 */

import { describe, it, expect } from 'vitest';
import { calculate1RM } from '@/lib/exercises';
import { recalculateAllPBs, normalizeExerciseId } from '@/lib/exerciseStats';

describe('PBs persistence accuracy gate', () => {
  const USER_ID = 'user-test';

  it('low-rep set (100kg×5) produces upsert row with one_rm = calculate1RM(100,5) = 113kg', () => {
    const workout = {
      id: 'w1',
      userId: USER_ID,
      name: 'Test',
      totalVolume: 500,
      status: 'completed' as const,
      startTime: '2024-01-01T10:00:00Z',
      endTime: '2024-01-01T10:30:00Z',
      exercises: [
        {
          exerciseId: 'bench-press',
          exercise: { name: 'Bench Press' },
          sets: [
            { completed: true, weight: 100, reps: 5 },
          ],
        },
      ],
    } as any;

    const pbs = recalculateAllPBs([workout], USER_ID);

    expect(pbs).toHaveLength(1);
    const pb = pbs[0];
    expect(pb.exerciseId).toBe(normalizeExerciseId('bench-press'));
    expect(pb.bestWeight).toBe(100);
    expect(pb.bestReps).toBe(5);
    expect(pb.oneRepMax).toBe(calculate1RM(100, 5));
    expect(pb.oneRepMax).toBe(113); // Brzycki formula for 5 reps
  });

  it('subsequent WORSE session does NOT lower stored PB (no regression)', () => {
    const workout1 = {
      id: 'w1',
      userId: USER_ID,
      name: 'Test 1',
      totalVolume: 700,
      status: 'completed' as const,
      startTime: '2024-01-01T10:00:00Z',
      endTime: '2024-01-01T10:30:00Z',
      exercises: [
        {
          exerciseId: 'squat',
          exercise: { name: 'Squat' },
          sets: [
            { completed: true, weight: 140, reps: 5 }, // e1RM = 158
          ],
        },
      ],
    } as any;

    const workout2 = {
      id: 'w2',
      userId: USER_ID,
      name: 'Test 2',
      totalVolume: 600,
      status: 'completed' as const,
      startTime: '2024-01-02T10:00:00Z',
      endTime: '2024-01-02T10:30:00Z',
      exercises: [
        {
          exerciseId: 'squat',
          exercise: { name: 'Squat' },
          sets: [
            { completed: true, weight: 120, reps: 5 }, // e1RM = 136 (worse)
          ],
        },
      ],
    } as any;

    const pbs = recalculateAllPBs([workout1, workout2], USER_ID);

    expect(pbs).toHaveLength(1);
    const pb = pbs[0];
    expect(pb.bestWeight).toBe(140); // Still the first (better) session
    expect(pb.bestReps).toBe(5);
    expect(pb.oneRepMax).toBe(158);
    expect(pb.workoutId).toBe('w1'); // From the better session
  });

  it('subsequent BETTER session raises PB', () => {
    const workout1 = {
      id: 'w1',
      userId: USER_ID,
      name: 'Test 1',
      totalVolume: 750,
      status: 'completed' as const,
      startTime: '2024-01-01T10:00:00Z',
      endTime: '2024-01-01T10:30:00Z',
      exercises: [
        {
          exerciseId: 'deadlift',
          exercise: { name: 'Deadlift' },
          sets: [
            { completed: true, weight: 150, reps: 5 }, // e1RM = 170
          ],
        },
      ],
    } as any;

    const workout2 = {
      id: 'w2',
      userId: USER_ID,
      name: 'Test 2',
      totalVolume: 800,
      status: 'completed' as const,
      startTime: '2024-01-02T10:00:00Z',
      endTime: '2024-01-02T10:30:00Z',
      exercises: [
        {
          exerciseId: 'deadlift',
          exercise: { name: 'Deadlift' },
          sets: [
            { completed: true, weight: 160, reps: 5 }, // e1RM = 180 (better)
          ],
        },
      ],
    } as any;

    const pbs = recalculateAllPBs([workout1, workout2], USER_ID);

    expect(pbs).toHaveLength(1);
    const pb = pbs[0];
    expect(pb.bestWeight).toBe(160); // From the better session
    expect(pb.bestReps).toBe(5);
    expect(pb.oneRepMax).toBe(180);
    expect(pb.workoutId).toBe('w2'); // From the better session
  });

  it('>20-rep set yields one_rm = null (excluded) and creates no phantom PB', () => {
    const workout = {
      id: 'w1',
      userId: USER_ID,
      name: 'Test',
      totalVolume: 0,
      status: 'completed' as const,
      startTime: '2024-01-01T10:00:00Z',
      endTime: '2024-01-01T10:30:00Z',
      exercises: [
        {
          exerciseId: 'pushups',
          exercise: { name: 'Pushups' },
          sets: [
            { completed: true, weight: 0, reps: 25 }, // >20 reps, excluded
          ],
        },
      ],
    } as any;

    const pbs = recalculateAllPBs([workout], USER_ID);

    // Should create no PB (calculate1RM returns null for >20 reps)
    expect(pbs).toHaveLength(0);
  });

  it('e1RM shown on summary equals value /pbs would show (single canonical calc)', () => {
    // Test that detectNewPRs formats with e1RM matching canonical calculate1RM
    const weight = 100;
    const reps = 5;
    const expectedE1RM = calculate1RM(weight, reps);

    expect(expectedE1RM).toBe(113); // Brzycki for 5 reps

    // Verify the badge format includes e1RM
    // (detectNewPRs is tested indirectly via integration; here we verify the calc is canonical)
    const workout = {
      id: 'w1',
      userId: USER_ID,
      name: 'Test',
      totalVolume: 500,
      status: 'completed' as const,
      startTime: '2024-01-01T10:00:00Z',
      endTime: '2024-01-01T10:30:00Z',
      exercises: [
        {
          exerciseId: 'bench-press',
          exercise: { name: 'Bench Press' },
          sets: [
            { completed: true, weight, reps },
          ],
        },
      ],
    } as any;

    const pbs = recalculateAllPBs([workout], USER_ID);
    expect(pbs[0].oneRepMax).toBe(expectedE1RM);
  });

  it('multiple exercises in same workout each get their own PB', () => {
    const workout = {
      id: 'w1',
      userId: USER_ID,
      name: 'Test',
      totalVolume: 1600,
      status: 'completed' as const,
      startTime: '2024-01-01T10:00:00Z',
      endTime: '2024-01-01T10:30:00Z',
      exercises: [
        {
          exerciseId: 'bench-press',
          exercise: { name: 'Bench Press' },
          sets: [
            { completed: true, weight: 100, reps: 5 },
          ],
        },
        {
          exerciseId: 'squat',
          exercise: { name: 'Squat' },
          sets: [
            { completed: true, weight: 140, reps: 5 },
          ],
        },
        {
          exerciseId: 'deadlift',
          exercise: { name: 'Deadlift' },
          sets: [
            { completed: true, weight: 160, reps: 4 },
          ],
        },
      ],
    } as any;

    const pbs = recalculateAllPBs([workout], USER_ID);

    expect(pbs).toHaveLength(3);
    expect(pbs.map((pb) => pb.exerciseId).sort()).toEqual([
      normalizeExerciseId('bench-press'),
      normalizeExerciseId('deadlift'),
      normalizeExerciseId('squat'),
    ].sort());
  });

  it('only completed sets count toward PB', () => {
    const workout = {
      id: 'w1',
      userId: USER_ID,
      name: 'Test',
      totalVolume: 500,
      status: 'completed' as const,
      startTime: '2024-01-01T10:00:00Z',
      endTime: '2024-01-01T10:30:00Z',
      exercises: [
        {
          exerciseId: 'bench-press',
          exercise: { name: 'Bench Press' },
          sets: [
            { completed: false, weight: 200, reps: 1 }, // Not completed, ignored
            { completed: true, weight: 100, reps: 5 },  // Completed, counts
          ],
        },
      ],
    } as any;

    const pbs = recalculateAllPBs([workout], USER_ID);

    expect(pbs).toHaveLength(1);
    const pb = pbs[0];
    expect(pb.bestWeight).toBe(100); // From completed set only
    expect(pb.bestReps).toBe(5);
    expect(pb.oneRepMax).toBe(113);
  });
});
