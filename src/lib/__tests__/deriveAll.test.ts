import { describe, it, expect, vi } from 'vitest';
import { recomputePBs, computeVolumeRollup, checkAllMedals, deriveAll } from '../deriveAll';
import type { Workout, WorkoutExercise } from '@/types';

// Helper: create a minimal workout for testing
function makeWorkout(overrides: Partial<Workout> & { id: string; userId: string }): Workout {
  return {
    name: 'Test Workout',
    exercises: [],
    startTime: '2026-01-01T10:00:00.000Z',
    totalVolume: 0,
    status: 'completed',
    ...overrides,
  };
}

// Helper: create a workout exercise with sets
function makeExercise(
  exerciseId: string,
  sets: Array<{ weight?: number; reps?: number; completed?: boolean }>,
): WorkoutExercise {
  return {
    id: `ex-${exerciseId}`,
    exerciseId,
    exercise: {
      id: exerciseId,
      name: exerciseId.replace(/-/g, ' '),
      primaryMuscles: ['chest'],
      secondaryMuscles: [],
      category: 'compound',
      equipment: 'barbell',
    },
    sets: sets.map((s, i) => ({
      id: `set-${i}`,
      setNumber: i + 1,
      type: 'normal' as const,
      weight: s.weight,
      reps: s.reps,
      completed: s.completed ?? true,
    })),
    restTimerSeconds: 90,
  };
}

// Simple identity normalizer for tests
const identityNormalizer = (id: string) => id;

describe('recomputePBs', () => {
  it('returns empty array when no workouts exist', () => {
    const pbs = recomputePBs([], 'user-1', identityNormalizer);
    expect(pbs).toEqual([]);
  });

  it('returns empty array when no completed workouts exist', () => {
    const workout = makeWorkout({
      id: 'w1',
      userId: 'user-1',
      status: 'active',
      exercises: [makeExercise('bench-press', [{ weight: 100, reps: 5 }])],
    });
    const pbs = recomputePBs([workout], 'user-1', identityNormalizer);
    expect(pbs).toEqual([]);
  });

  it('returns empty array for deleted workouts', () => {
    const workout = makeWorkout({
      id: 'w1',
      userId: 'user-1',
      deletedAt: '2026-01-02T00:00:00.000Z',
      exercises: [makeExercise('bench-press', [{ weight: 100, reps: 5 }])],
    });
    const pbs = recomputePBs([workout], 'user-1', identityNormalizer);
    expect(pbs).toEqual([]);
  });

  it('returns empty array for other users', () => {
    const workout = makeWorkout({
      id: 'w1',
      userId: 'user-2',
      exercises: [makeExercise('bench-press', [{ weight: 100, reps: 5 }])],
    });
    const pbs = recomputePBs([workout], 'user-1', identityNormalizer);
    expect(pbs).toEqual([]);
  });

  it('derives a PB from a single completed workout', () => {
    const workout = makeWorkout({
      id: 'w1',
      userId: 'user-1',
      exercises: [makeExercise('bench-press', [{ weight: 100, reps: 5 }])],
    });
    const pbs = recomputePBs([workout], 'user-1', identityNormalizer);
    expect(pbs).toHaveLength(1);
    expect(pbs[0].exerciseId).toBe('bench-press');
    expect(pbs[0].bestWeight).toBe(100);
    expect(pbs[0].bestReps).toBe(5);
    // Epley: 100 * (1 + 5/30) = 100 * 1.1667 = 116.7
    expect(pbs[0].oneRepMax).toBeCloseTo(116.7, 0);
  });

  it('picks the highest 1RM across multiple workouts', () => {
    const w1 = makeWorkout({
      id: 'w1', userId: 'user-1',
      startTime: '2026-01-01T10:00:00.000Z',
      exercises: [makeExercise('bench-press', [{ weight: 80, reps: 5 }])],
    });
    const w2 = makeWorkout({
      id: 'w2', userId: 'user-1',
      startTime: '2026-01-08T10:00:00.000Z',
      exercises: [makeExercise('bench-press', [{ weight: 100, reps: 3 }])],
    });
    const pbs = recomputePBs([w1, w2], 'user-1', identityNormalizer);
    expect(pbs).toHaveLength(1);
    // 100 * (1 + 3/30) = 110
    expect(pbs[0].bestWeight).toBe(100);
    expect(pbs[0].oneRepMax).toBeCloseTo(110, 0);
  });

  it('handles tie: same 1RM from different weight/reps combos', () => {
    const w1 = makeWorkout({
      id: 'w1', userId: 'user-1',
      startTime: '2026-01-01T10:00:00.000Z',
      exercises: [makeExercise('squat', [{ weight: 120, reps: 5 }])],
    });
    const w2 = makeWorkout({
      id: 'w2', userId: 'user-1',
      startTime: '2026-01-08T10:00:00.000Z',
      exercises: [makeExercise('squat', [{ weight: 140, reps: 1 }])],
    });
    const pbs = recomputePBs([w1, w2], 'user-1', identityNormalizer);
    expect(pbs).toHaveLength(1);
    // 140 * 1 = 140 (reps=1 returns weight directly)
    expect(pbs[0].oneRepMax).toBe(140);
  });

  it('skips sets with reps > 20', () => {
    const workout = makeWorkout({
      id: 'w1', userId: 'user-1',
      exercises: [makeExercise('squat', [
        { weight: 50, reps: 25 },
        { weight: 100, reps: 5 },
      ])],
    });
    const pbs = recomputePBs([workout], 'user-1', identityNormalizer);
    expect(pbs).toHaveLength(1);
    expect(pbs[0].bestWeight).toBe(100);
  });

  it('skips incomplete sets', () => {
    const workout = makeWorkout({
      id: 'w1', userId: 'user-1',
      exercises: [makeExercise('squat', [
        { weight: 200, reps: 1, completed: false },
        { weight: 100, reps: 5, completed: true },
      ])],
    });
    const pbs = recomputePBs([workout], 'user-1', identityNormalizer);
    expect(pbs).toHaveLength(1);
    expect(pbs[0].bestWeight).toBe(100);
  });
});

describe('computeVolumeRollup', () => {
  it('returns zeroed rollup for no workouts', () => {
    const rollup = computeVolumeRollup([], 'user-1');
    expect(rollup.userId).toBe('user-1');
    expect(rollup.totalLifetime).toBe(0);
    expect(rollup.byMuscleGroup).toEqual({});
    expect(rollup.perExercise).toEqual({});
    expect(rollup.weeklyVolume).toEqual([]);
    expect(rollup.monthlyVolume).toEqual([]);
  });

  it('sums totalVolume across completed workouts', () => {
    const w1 = makeWorkout({ id: 'w1', userId: 'user-1', totalVolume: 5000 });
    const w2 = makeWorkout({ id: 'w2', userId: 'user-1', totalVolume: 3000 });
    const rollup = computeVolumeRollup([w1, w2], 'user-1');
    expect(rollup.totalLifetime).toBe(8000);
  });

  it('filters out other users and non-completed workouts', () => {
    const w1 = makeWorkout({ id: 'w1', userId: 'user-1', totalVolume: 5000 });
    const w2 = makeWorkout({ id: 'w2', userId: 'user-2', totalVolume: 9999 });
    const w3 = makeWorkout({ id: 'w3', userId: 'user-1', totalVolume: 9999, status: 'active' });
    const rollup = computeVolumeRollup([w1, w2, w3], 'user-1');
    expect(rollup.totalLifetime).toBe(5000);
  });

  it('groups weekly volume by week start (Monday)', () => {
    // Use a Thursday at noon local time to avoid timezone edge cases
    const thursday = new Date();
    const day = thursday.getDay();
    // Set to Thursday (4) of this week
    thursday.setDate(thursday.getDate() + (4 - day));
    thursday.setHours(12, 0, 0, 0);
    const w1 = makeWorkout({
      id: 'w1', userId: 'user-1', totalVolume: 1000,
      startTime: thursday.toISOString(),
    });
    const rollup = computeVolumeRollup([w1], 'user-1');
    expect(rollup.weeklyVolume).toHaveLength(1);
    expect(rollup.weeklyVolume[0].volume).toBe(1000);
    // weekStart should be the Monday of that week
    const weekStartDay = new Date(rollup.weeklyVolume[0].weekStart + 'T00:00:00');
    expect(weekStartDay.getDay()).toBe(1); // Monday
  });
});

describe('checkAllMedals', () => {
  // Mock medal deps that track awarded medals
  function makeMedalDeps(existing: Set<string> = new Set()) {
    const awarded: string[] = [];
    return {
      deps: {
        hasMedal: (id: string) => existing.has(id),
        earnMedal: (id: string) => { existing.add(id); awarded.push(id); },
        revokeMedalsForUser: (userId: string) => { existing.clear(); },
        normalizeExerciseId: identityNormalizer,
      },
      awarded,
    };
  }

  it('awards first-blood for first completed workout', () => {
    const workout = makeWorkout({
      id: 'w1', userId: 'user-1',
      exercises: [makeExercise('bench-press', [{ weight: 100, reps: 5 }])],
    });
    const { deps, awarded } = makeMedalDeps();
    checkAllMedals([workout], 'user-1', workout, deps);
    expect(awarded).toContain('first-blood');
  });

  it('awards getting-started at 5 workouts', () => {
    const workouts = Array.from({ length: 5 }, (_, i) =>
      makeWorkout({ id: `w${i}`, userId: 'user-1', startTime: `2026-01-0${i + 1}T10:00:00.000Z` }),
    );
    const { deps, awarded } = makeMedalDeps();
    checkAllMedals(workouts, 'user-1', workouts[4], deps);
    expect(awarded).toContain('getting-started');
    expect(awarded).toContain('first-blood');
  });

  it('awards volume-10k when total volume >= 10000', () => {
    const workout = makeWorkout({
      id: 'w1', userId: 'user-1', totalVolume: 12000,
    });
    const { deps, awarded } = makeMedalDeps();
    checkAllMedals([workout], 'user-1', workout, deps);
    expect(awarded).toContain('volume-10k');
  });

  it('does not award volume-10k when total volume < 10000', () => {
    const workout = makeWorkout({
      id: 'w1', userId: 'user-1', totalVolume: 5000,
    });
    const { deps, awarded } = makeMedalDeps();
    checkAllMedals([workout], 'user-1', workout, deps);
    expect(awarded).not.toContain('volume-10k');
  });

  it('awards early-bird for workout before 7am', () => {
    // Use local time 5:30am to avoid timezone issues with getHours()
    const earlyDate = new Date();
    earlyDate.setHours(5, 30, 0, 0);
    const workout = makeWorkout({
      id: 'w1', userId: 'user-1',
      startTime: earlyDate.toISOString(),
    });
    const { deps, awarded } = makeMedalDeps();
    checkAllMedals([workout], 'user-1', workout, deps);
    expect(awarded).toContain('early-bird');
  });

  it('awards night-owl for workout at or after 10pm', () => {
    // Use local time 10:30pm to avoid timezone issues with getHours()
    const lateDate = new Date();
    lateDate.setHours(22, 30, 0, 0);
    const workout = makeWorkout({
      id: 'w1', userId: 'user-1',
      startTime: lateDate.toISOString(),
    });
    const { deps, awarded } = makeMedalDeps();
    checkAllMedals([workout], 'user-1', workout, deps);
    expect(awarded).toContain('night-owl');
  });

  it('awards perfectionist when all sets completed', () => {
    const workout = makeWorkout({
      id: 'w1', userId: 'user-1',
      exercises: [makeExercise('bench-press', [
        { weight: 100, reps: 5, completed: true },
        { weight: 100, reps: 5, completed: true },
      ])],
    });
    const { deps, awarded } = makeMedalDeps();
    checkAllMedals([workout], 'user-1', workout, deps);
    expect(awarded).toContain('perfectionist');
  });

  it('does not award perfectionist when not all sets completed', () => {
    const workout = makeWorkout({
      id: 'w1', userId: 'user-1',
      exercises: [makeExercise('bench-press', [
        { weight: 100, reps: 5, completed: true },
        { weight: 100, reps: 5, completed: false },
      ])],
    });
    const { deps, awarded } = makeMedalDeps();
    checkAllMedals([workout], 'user-1', workout, deps);
    expect(awarded).not.toContain('perfectionist');
  });

  it('awards weekend-warrior for Saturday workout', () => {
    // Find the next Saturday from today
    const saturday = new Date();
    const day = saturday.getDay();
    saturday.setDate(saturday.getDate() + (6 - day));
    saturday.setHours(10, 0, 0, 0);
    const workout = makeWorkout({
      id: 'w1', userId: 'user-1',
      startTime: saturday.toISOString(),
    });
    const { deps, awarded } = makeMedalDeps();
    checkAllMedals([workout], 'user-1', workout, deps);
    expect(awarded).toContain('weekend-warrior');
  });

  it('awards double-session when 2 workouts on same day', () => {
    const w1 = makeWorkout({ id: 'w1', userId: 'user-1', startTime: '2026-01-01T08:00:00.000Z' });
    const w2 = makeWorkout({ id: 'w2', userId: 'user-1', startTime: '2026-01-01T16:00:00.000Z' });
    const { deps, awarded } = makeMedalDeps();
    checkAllMedals([w1, w2], 'user-1', w2, deps);
    expect(awarded).toContain('double-session');
  });

  it('does not re-award already earned medals', () => {
    const workout = makeWorkout({ id: 'w1', userId: 'user-1' });
    const existing = new Set(['first-blood']);
    const { deps, awarded } = makeMedalDeps(existing);
    checkAllMedals([workout], 'user-1', workout, deps);
    expect(awarded).not.toContain('first-blood');
  });
});

describe('deriveAll pipeline', () => {
  it('returns DeriveResult with PBs, medals, and volume rollup', () => {
    const workout = makeWorkout({
      id: 'w1', userId: 'user-1',
      totalVolume: 15000,
      exercises: [makeExercise('bench-press', [{ weight: 100, reps: 5 }])],
    });

    const existing = new Set<string>();
    const result = deriveAll({
      workouts: [workout],
      userId: 'user-1',
      completedWorkout: workout,
      normalizeExerciseId: identityNormalizer,
      medalDeps: {
        hasMedal: (id) => existing.has(id),
        earnMedal: (id) => { existing.add(id); },
        revokeMedalsForUser: () => { existing.clear(); },
        normalizeExerciseId: identityNormalizer,
      },
      calculateStrengthRatingForUser: vi.fn(),
    });

    expect(result.personalBests).toHaveLength(1);
    expect(result.medalsAwarded).toContain('first-blood');
    expect(result.volumeRollup.totalLifetime).toBe(15000);
    expect(result.strengthRatingUpdated).toBe(true);
  });

  it('handles empty workout history gracefully', () => {
    const existing = new Set<string>();
    const result = deriveAll({
      workouts: [],
      userId: 'user-1',
      completedWorkout: null,
      normalizeExerciseId: identityNormalizer,
      medalDeps: {
        hasMedal: (id) => existing.has(id),
        earnMedal: (id) => { existing.add(id); },
        revokeMedalsForUser: () => { existing.clear(); },
        normalizeExerciseId: identityNormalizer,
      },
      calculateStrengthRatingForUser: vi.fn(),
    });

    expect(result.personalBests).toEqual([]);
    expect(result.medalsAwarded).toEqual([]);
    expect(result.volumeRollup.totalLifetime).toBe(0);
  });
});
