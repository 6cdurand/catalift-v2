import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { calculate1RM } from '../exercises';
import { recomputePBs } from '../deriveAll';
import { calculateFullStrengthRating, calculate1RM as strengthRatingCalc1RM } from '../strengthRating';
import type { Workout, WorkoutExercise, PersonalBest } from '@/types';

// ============ Helpers (mirror deriveAll.test.ts) ============

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

const identity = (id: string) => id;

/** The stored oneRepMax that deriveAll would persist for a single (weight, reps) set. */
function storedOneRepMax(weight: number, reps: number): number | null {
  const workout = makeWorkout({
    id: 'w1',
    userId: 'user-1',
    exercises: [makeExercise('bench-press', [{ weight, reps }])],
  });
  const pbs = recomputePBs([workout], 'user-1', identity);
  return pbs.length ? pbs[0].oneRepMax : null;
}

// ============ Canonical formula ============

describe('calculate1RM — LOCKED canonical formula', () => {
  it('reps === 1 returns the weight EXACTLY (true 1RM, not Epley-inflated)', () => {
    // Epley at 1 rep would give 140 * (1 + 1/30) ≈ 145 (+3.3%). Brzycki 36/36 = 1.0 → 140.
    expect(calculate1RM(140, 1)).toBe(140);
  });

  it('reps 1–6 use Brzycki: 100×5 → round(100 × 36/32) = 113', () => {
    expect(calculate1RM(100, 5)).toBe(113);
  });

  it('reps 7–20 use Epley: 100×10 → round(100 × (1 + 10/30)) = 133', () => {
    expect(calculate1RM(100, 10)).toBe(133);
  });

  it('reps > 20 → null (excluded, not a PB)', () => {
    expect(calculate1RM(100, 21)).toBeNull();
    expect(calculate1RM(100, 25)).toBeNull();
  });

  it('guards: reps <= 0 or weight <= 0 → null', () => {
    expect(calculate1RM(100, 0)).toBeNull();
    expect(calculate1RM(100, -3)).toBeNull();
    expect(calculate1RM(0, 5)).toBeNull();
    expect(calculate1RM(-50, 5)).toBeNull();
  });

  it('returns whole kg (Math.round), never sub-kg precision', () => {
    const v = calculate1RM(102.5, 4)!; // Brzycki 102.5 × 36/33 = 111.8…
    expect(Number.isInteger(v)).toBe(true);
  });
});

// ============ Badge == stored parity ============

describe('BUG-302 — badge (exercises.calculate1RM) === stored PB (deriveAll)', () => {
  it('agree for a ≤6-rep set (100×5 → 113 on BOTH paths)', () => {
    expect(calculate1RM(100, 5)).toBe(113);
    expect(storedOneRepMax(100, 5)).toBe(113);
    expect(storedOneRepMax(100, 5)).toBe(calculate1RM(100, 5));
  });

  it('agree for a 7–20-rep set (100×10 → 133 on BOTH paths)', () => {
    expect(calculate1RM(100, 10)).toBe(133);
    expect(storedOneRepMax(100, 10)).toBe(133);
    expect(storedOneRepMax(100, 10)).toBe(calculate1RM(100, 10));
  });

  it('>20-rep set produces NO stored PB (100×25) on both paths', () => {
    expect(calculate1RM(100, 25)).toBeNull();
    expect(storedOneRepMax(100, 25)).toBeNull();
  });

  it('a >20-rep set never displaces a valid PB in the same recompute', () => {
    const workout = makeWorkout({
      id: 'w1',
      userId: 'user-1',
      exercises: [makeExercise('bench-press', [
        { weight: 100, reps: 5 },   // valid → 113
        { weight: 300, reps: 25 },  // >20 → excluded despite huge weight
      ])],
    });
    const pbs = recomputePBs([workout], 'user-1', identity);
    expect(pbs).toHaveLength(1);
    expect(pbs[0].bestWeight).toBe(100);
    expect(pbs[0].oneRepMax).toBe(113);
  });

  // Property/grid parity test — the permanent anti-re-divergence guard.
  it('deriveAll stored value === exercises.calculate1RM across a grid', () => {
    for (let weight = 20; weight <= 200; weight += 20) {
      for (let reps = 1; reps <= 20; reps += 1) {
        expect(storedOneRepMax(weight, reps)).toBe(calculate1RM(weight, reps));
      }
    }
  });
});

// ============ Single-source guard (fails if deriveAll re-declares its own) ============

describe('BUG-302 — exactly one calculate1RM definition', () => {
  it('deriveAll.ts imports calculate1RM and does NOT declare its own', () => {
    const deriveAllSrc = readFileSync(
      join(process.cwd(), 'src/lib/deriveAll.ts'),
      'utf8',
    );
    expect(deriveAllSrc).not.toMatch(/function\s+calculate1RM/);
    expect(deriveAllSrc).toMatch(/import\s*{[^}]*calculate1RM[^}]*}\s*from\s*'\.\/exercises'/);
  });

  it('strengthRating re-exports the SAME calculate1RM (no third copy)', () => {
    expect(strengthRatingCalc1RM).toBe(calculate1RM);
    const srSrc = readFileSync(
      join(process.cwd(), 'src/lib/strengthRating.ts'),
      'utf8',
    );
    expect(srSrc).not.toMatch(/function\s+calculate1RM/);
  });
});

// ============ strengthRating port parity (deterministic) ============

describe('strengthRating — port + shared-fn swap preserves ratings', () => {
  // Recent PB (today) → recency decay = 1.0, so the math is deterministic.
  const now = new Date().toISOString();

  const benchOnlyPBs: PersonalBest[] = [
    {
      id: 'pb-bench',
      exerciseId: 'bench-press',
      userId: 'user-1',
      oneRepMax: 110, // advanced range [101,136] → 25.71% into tier
      bestWeight: 100,
      bestReps: 5,
      bestVolume: 0,
      achievedAt: now,
      workoutId: 'w1',
    },
  ];

  it('computes chest points and overall from a single bench PB (male)', () => {
    const rating = calculateFullStrengthRating(benchOnlyPBs, true);
    // middle-chest slice is above the category (beginner) tier → maxed to its
    // weight (40); other chest slices contribute 0 → chest.totalPoints = 40.
    expect(rating.categories.chest.totalPoints).toBe(40);
    expect(rating.categories.chest.tier).toBe('beginner');
    // Only chest has data → overall = round(40 / 4 categories) = 10.
    expect(rating.overall).toBe(10);
    expect(rating.overallTier).toBe('beginner');
    // Untouched categories stay at 0.
    expect(rating.categories.back.totalPoints).toBe(0);
    expect(rating.categories.legs.totalPoints).toBe(0);
  });

  it('empty PBs → all-zero, beginner overall', () => {
    const rating = calculateFullStrengthRating([], true);
    expect(rating.overall).toBe(0);
    expect(rating.overallTier).toBe('beginner');
    expect(rating.categories.shoulders.totalPoints).toBe(0);
  });
});
