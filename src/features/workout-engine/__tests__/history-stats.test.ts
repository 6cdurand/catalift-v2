import { describe, it, expect } from 'vitest';
import { detectNewPRs, buildPreviousBests, type HistoryWorkout } from '../lib/history-stats';
import type { WorkoutBlock, LoggedSet } from '../types';

function set(weight: number | null, reps: number | null, completed = true, n = 1): LoggedSet {
  return { id: `s${n}-${weight}-${reps}`, setNumber: n, weight, reps, completed };
}

function straight(exerciseId: string, exerciseName: string, sets: LoggedSet[]): WorkoutBlock {
  return {
    id: `b-${exerciseId}`,
    kind: 'straight',
    exercise: { id: `e-${exerciseId}`, exerciseId, exerciseName, sets },
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
    expect(map['bench-press']).toEqual({ weight: 105, reps: 5 });
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
