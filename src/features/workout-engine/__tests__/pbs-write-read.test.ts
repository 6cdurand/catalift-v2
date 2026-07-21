/**
 * pbs-write-read.test.ts — PB write→read round-trip (F1 sweep)
 *
 * Drives the real `upsertPersonalBests` + `fetchPersonalBests` API (not a logic
 * copy) through a mocked Supabase client and asserts:
 * 1. Completing a workout produces an upsert row keyed by (user_id, exercise_id)
 *    with the canonical e1RM.
 * 2. A subsequent worse session does NOT lower the stored all-time PB.
 * 3. `fetchPersonalBests` returns the same canonical e1RM the page would render.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { upsertPersonalBests } from '../api/upsert-personal-bests';
import { fetchPersonalBests } from '../api/fetch-personal-bests';
import { getBrowserClient } from '@/lib/supabase';
import type { WorkoutBlock } from '../types';

vi.mock('@/lib/sentry', () => ({ captureException: vi.fn() }));
vi.mock('@/lib/supabase', () => ({
  getBrowserClient: vi.fn(),
}));

function block(exerciseId: string, exerciseName: string, sets: Array<{ weight: number; reps: number }>): WorkoutBlock {
  return {
    id: `block-${exerciseId}`,
    kind: 'straight',
    blockType: 'strength',
    exercises: [
      {
        id: `ex-${exerciseId}`,
        exerciseId,
        exerciseName,
        sets: sets.map((s, i) => ({
          id: `set-${i}`,
          setNumber: i + 1,
          weight: s.weight,
          reps: s.reps,
          completed: true,
        })),
      },
    ],
  };
}

function buildMockClient(capture: { upsert?: any; selectData?: any } = {}) {
  const fromImpl = (table: string) => {
    if (table === 'personal_bests') {
      return {
        upsert: vi.fn((rows: any, opts: any) => {
          capture.upsert = { rows, opts };
          return Promise.resolve({ error: null });
        }),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() =>
                Promise.resolve({ data: capture.selectData ?? [], error: null }),
              ),
            })),
          })),
        })),
      };
    }
    throw new Error(`Unexpected table in test: ${table}`);
  };

  return { from: fromImpl };
}

describe('PB write → read round-trip', () => {
  const USER_ID = 'user-test';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes a PB row with canonical e1RM and (user_id, exercise_id) upsert key', async () => {
    const capture: { upsert?: any } = {};
    vi.mocked(getBrowserClient).mockReturnValue(buildMockClient(capture) as any);

    const completed = {
      id: 'w-1',
      userId: USER_ID,
      performedAt: '2026-07-19T10:00:00.000Z',
      blocks: [block('bench-press', 'Bench Press', [{ weight: 100, reps: 5 }])],
    };

    const ok = await upsertPersonalBests(completed, []);
    expect(ok).toBe(true);

    expect(capture.upsert).toBeDefined();
    expect(capture.upsert.opts).toEqual({ onConflict: 'user_id,exercise_id' });
    expect(capture.upsert.rows).toHaveLength(1);

    const row = capture.upsert.rows[0];
    expect(row.user_id).toBe(USER_ID);
    expect(row.exercise_id).toBe('bench-press');
    expect(row.exercise_name).toBe('Bench Press');
    expect(row.weight).toBe(100);
    expect(row.reps).toBe(5);
    expect(row.one_rm).toBe(113); // Brzycki canonical for 100×5
    expect(row.achieved_on).toBe(completed.performedAt);
  });

  it('does not lower the all-time PB when the new session is weaker', async () => {
    const capture: { upsert?: any } = {};
    vi.mocked(getBrowserClient).mockReturnValue(buildMockClient(capture) as any);

    // History: 140×5 (e1RM = 158)
    const history = [
      {
        id: 'w-0',
        userId: USER_ID,
        performedAt: '2026-07-18T10:00:00.000Z',
        blocks: [block('bench-press', 'Bench Press', [{ weight: 140, reps: 5 }])],
      },
    ];

    // Today: 120×5 (e1RM = 136) — worse
    const completed = {
      id: 'w-1',
      userId: USER_ID,
      performedAt: '2026-07-19T10:00:00.000Z',
      blocks: [block('bench-press', 'Bench Press', [{ weight: 120, reps: 5 }])],
    };

    await upsertPersonalBests(completed, history);

    const row = capture.upsert!.rows[0];
    expect(row.weight).toBe(140); // history's better set
    expect(row.reps).toBe(5);
    expect(row.one_rm).toBe(158);
  });

  it('fetchPersonalBests reads back the same canonical e1RM the page displays', async () => {
    const capture: { selectData?: any } = {};
    vi.mocked(getBrowserClient).mockReturnValue(buildMockClient(capture) as any);

    capture.selectData = [
      {
        id: 'pb-1',
        user_id: USER_ID,
        exercise_id: 'bench-press',
        exercise_name: 'Bench Press',
        weight: 100,
        reps: 5,
        one_rm: 113,
        best_volume: 450,
        achieved_on: '2026-07-19T10:00:00.000Z',
      },
    ];

    const pbs = await fetchPersonalBests(USER_ID);

    expect(pbs).toHaveLength(1);
    expect(pbs[0].oneRepMax).toBe(113);
    expect(pbs[0].bestWeight).toBe(100);
    expect(pbs[0].bestReps).toBe(5);
    expect(pbs[0].exerciseName).toBe('Bench Press');
  });
});
