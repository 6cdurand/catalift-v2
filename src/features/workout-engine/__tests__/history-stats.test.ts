import { describe, it, expect } from 'vitest';
import {
  detectNewPRs,
  buildPreviousBests,
  newPersonalBestOneRm,
  type HistoryWorkout,
} from '../lib/history-stats';
import { calculate1RM } from '@/lib/exercises';
import type { WorkoutBlock, LoggedSet } from '../types';

function set(weight: number | null, reps: number | null, completed = true, n = 1): LoggedSet {
  return { id: `s${n}-${weight}-${reps}`, setNumber: n, weight, reps, completed };
}

function straight(exerciseId: string, exerciseName: string, sets: LoggedSet[]): WorkoutBlock {
  return {
    id: `b-${exerciseId}`,
    kind: 'straight',
    blockType: 'strength',
    exercises: [{ id: `e-${exerciseId}`, exerciseId, exerciseName, sets }],
  };
}

function workout(id: string, performedAt: string, blocks: WorkoutBlock[]): HistoryWorkout {
  return { id, performedAt, blocks };
}

describe('detectNewPRs', () => {
  it('flags a first-ever lift as a PR (no prior history)', () => {
    const completed = workout('w1', '2026-02-01T10:00:00.000Z', [
      straight('bench-press', 'Bench Press', [set(100, 5)]),
    ]);
    const prs = detectNewPRs(completed, [], 'u1');
    expect(prs).toHaveLength(1);
    expect(prs[0]).toContain('Bench Press');
    expect(prs[0]).toContain('100kg');
  });

  it('flags an improvement over prior history as a PR', () => {
    const history = [
      workout('w0', '2026-01-01T10:00:00.000Z', [
        straight('bench-press', 'Bench Press', [set(80, 5)]),
      ]),
    ];
    const completed = workout('w1', '2026-02-01T10:00:00.000Z', [
      straight('bench-press', 'Bench Press', [set(100, 5)]),
    ]);
    const prs = detectNewPRs(completed, history, 'u1');
    expect(prs).toHaveLength(1);
    expect(prs[0]).toContain('100kg');
  });

  it('does NOT flag a PR when the session is weaker than history', () => {
    const history = [
      workout('w0', '2026-01-01T10:00:00.000Z', [
        straight('bench-press', 'Bench Press', [set(120, 5)]),
      ]),
    ];
    const completed = workout('w1', '2026-02-01T10:00:00.000Z', [
      straight('bench-press', 'Bench Press', [set(100, 5)]),
    ]);
    expect(detectNewPRs(completed, history, 'u1')).toEqual([]);
  });

  it('ignores the completed workout if it also appears in history (dedupe by id)', () => {
    const completed = workout('w1', '2026-02-01T10:00:00.000Z', [
      straight('squat', 'Squat', [set(140, 3)]),
    ]);
    // Passing the same workout in history must not suppress its own first-ever PR.
    const prs = detectNewPRs(completed, [completed], 'u1');
    expect(prs).toHaveLength(1);
    expect(prs[0]).toContain('Squat');
  });
});

describe('buildPreviousBests', () => {
  it('picks the most recent completed weight×reps per exercise (newest-first)', () => {
    const history = [
      workout('w2', '2026-02-01T10:00:00.000Z', [
        straight('bench-press', 'Bench Press', [set(105, 5)]),
      ]),
      workout('w1', '2026-01-01T10:00:00.000Z', [
        straight('bench-press', 'Bench Press', [set(90, 5)]),
      ]),
    ];
    const map = buildPreviousBests(history);
    expect(map['bench-press']).toMatchObject({ weight: 105, reps: 5 });
  });

  it('captures the source workout date + all completed sets (#83)', () => {
    const history = [
      workout('w2', '2026-02-01T10:00:00.000Z', [
        straight('squat', 'Squat', [set(140, 5, true, 1), set(140, 3, true, 2)]),
      ]),
      workout('w1', '2026-01-01T10:00:00.000Z', [
        straight('squat', 'Squat', [set(120, 5)]),
      ]),
    ];
    const map = buildPreviousBests(history);
    expect(map['squat'].date).toBe('2026-02-01T10:00:00.000Z'); // newest wins
    expect(map['squat'].lastSets).toEqual([
      { weight: 140, reps: 5 },
      { weight: 140, reps: 3 },
    ]);
  });

  it('skips incomplete and bodyweight (null-weight) sets', () => {
    const history = [
      workout('w1', '2026-01-01T10:00:00.000Z', [
        straight('pull-up', 'Pull-up', [set(null, 10)]),
        straight('row', 'Row', [set(60, 8, false)]),
      ]),
    ];
    const map = buildPreviousBests(history);
    expect(map['pull-up']).toBeUndefined();
    expect(map['row']).toBeUndefined();
  });

  it('returns an empty map for empty history', () => {
    expect(buildPreviousBests([])).toEqual({});
  });
});

describe('newPersonalBestOneRm (PB toast predicate, #83)', () => {
  it('returns the e1RM when the set strictly beats the prior best', () => {
    const prior = calculate1RM(100, 5)!;
    expect(newPersonalBestOneRm(110, 5, prior)).toBe(calculate1RM(110, 5));
  });

  it('returns null when the set does NOT beat the prior best', () => {
    const prior = calculate1RM(120, 5)!;
    expect(newPersonalBestOneRm(100, 5, prior)).toBeNull();
  });

  it('returns null on a tie (must be a strict improvement)', () => {
    const prior = calculate1RM(100, 5)!;
    expect(newPersonalBestOneRm(100, 5, prior)).toBeNull();
  });

  it('treats a first-ever lift (priorBest 0) as a PB', () => {
    expect(newPersonalBestOneRm(60, 5, 0)).toBe(calculate1RM(60, 5));
  });

  it('returns null for null/invalid inputs or >20 reps', () => {
    expect(newPersonalBestOneRm(null, 5, 0)).toBeNull();
    expect(newPersonalBestOneRm(100, null, 0)).toBeNull();
    expect(newPersonalBestOneRm(100, 21, 0)).toBeNull();
  });

  it('fires once per exercise when the caller de-dupes by id (session guard)', () => {
    const toasted = new Set<string>();
    let toasts = 0;
    const celebrate = (exId: string, weight: number, reps: number, prior: number) => {
      if (toasted.has(exId)) return;
      if (newPersonalBestOneRm(weight, reps, prior) != null) {
        toasted.add(exId);
        toasts += 1;
      }
    };
    celebrate('bench', 110, 5, calculate1RM(100, 5)!); // fires
    celebrate('bench', 115, 5, calculate1RM(100, 5)!); // suppressed (same exercise)
    expect(toasts).toBe(1);
    celebrate('squat', 150, 5, 0); // different exercise → fires
    expect(toasts).toBe(2);
  });
});
