// Active workout store \u2014 Zustand state for the in-progress LoggedWorkout (w2a).
// Ports v1's workoutStore.ts set-manipulation actions, adapted to v2 blocks + types.
// Persists in IndexedDB under user-scoped key; finishWorkout serializes + persists via data-sync (G-11).

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';
import type { LoggedWorkout, WorkoutBlock, LoggedSet, CardioPayload, ExerciseEntry, DropSet, StraightBlockType } from '../types';
import { newId } from '../lib/ids';
import { computeTotalVolume } from '../lib/volume';
import { toRow } from '../lib/serialize';
import { persist as persistWorkout } from '../api/persist';
import { getIdbItem, setIdbItem, removeIdbItem } from '@/lib/storage';

export function entriesOfBlock(block: WorkoutBlock): ExerciseEntry[] {
  if (block.kind === 'straight') return block.exercises;
  if (block.kind === 'superset') return block.exercises;
  if (block.kind === 'circuit') return block.stations;
  return []; // cardio has no entries
}

function mapEntry(
  blocks: WorkoutBlock[],
  entryId: string,
  fn: (e: ExerciseEntry) => ExerciseEntry,
): WorkoutBlock[] {
  return blocks.map((block) => {
    if (block.kind === 'straight') {
      const idx = block.exercises.findIndex((e) => e.id === entryId);
      if (idx === -1) return block;
      const exercises = [...block.exercises];
      exercises[idx] = fn(exercises[idx]);
      return { ...block, exercises };
    }
    if (block.kind === 'superset') {
      const idx = block.exercises.findIndex((e) => e.id === entryId);
      if (idx === -1) return block;
      const exercises = [...block.exercises];
      exercises[idx] = fn(exercises[idx]);
      return { ...block, exercises };
    }
    if (block.kind === 'circuit') {
      const idx = block.stations.findIndex((s) => s.id === entryId);
      if (idx === -1) return block;
      const stations = [...block.stations];
      stations[idx] = fn(stations[idx]);
      return { ...block, stations };
    }
    return block;
  });
}

/** Last logged weight×reps per exerciseId, derived from Supabase history (read-only). */
export type PreviousBestMap = Record<string, { weight: number | null; reps: number | null }>;

/** B1: Rest timer state (ported from v1) */
interface RestTimerState {
  isRunning: boolean;
  seconds: number;
}

interface ActiveWorkoutState {
  activeWorkout: LoggedWorkout | null;
  workoutTimerSeconds: number;
  timerRunning: boolean;
  isFinishing: boolean;
  hasHydrated: boolean;
  // v1-parity active-block model: the straight block that in-block/add-bar "Add Exercise"
  // targets. addBlock() sets it; addExercise() appends to it (inheriting blockType).
  activeBlockId: string | null;
  // Previous-set display (Wave: workout-fidelity). Seeded from fetch-history on the
  // active page; NOT persisted (see partialize) so it never leaks across accounts.
  previousByExerciseId: PreviousBestMap;
  // B1: Rest timer (ported from v1)
  restTimer: RestTimerState;

  // Lifecycle
  startWorkout: (params: { userId: string; name?: string }) => void;
  setPreviousBests: (map: PreviousBestMap) => void;
  cancelWorkout: () => void;
  finishWorkout: () => Promise<LoggedWorkout | null>;

  // v1-parity block model: create an empty typed straight block + make it active.
  addBlock: (blockType: StraightBlockType) => void;
  setActiveBlock: (blockId: string | null) => void;

  // Exercise actions (operate on blocks)
  addExercise: (exercise: { exerciseId: string; exerciseName: string }) => void;
  removeExercise: (entryId: string) => void;

  // Block creation + removal (w2b)
  addSupersetBlock: (exercises: { exerciseId: string; exerciseName: string }[]) => void;
  addCircuitBlock: (params: {
    stations: { exerciseId: string; exerciseName: string }[];
    rounds: number;
    restSeconds?: number;
  }) => void;
  removeBlock: (blockId: string) => void;
  addRound: (circuitBlockId: string) => void;

  // Set actions
  addSet: (entryId: string) => void;
  removeSet: (entryId: string, setId: string) => void;
  updateSet: (entryId: string, setId: string, updates: Partial<LoggedSet>) => void;
  completeSet: (entryId: string, setId: string) => void;
  uncompleteSet: (entryId: string, setId: string) => void;

  // Drop-set actions (faithful port of v1 handleAddDropSet :1322 + set.drops edit/remove)
  addDropSet: (entryId: string) => void;
  updateDrop: (entryId: string, setId: string, dropId: string, updates: Partial<DropSet>) => void;
  removeDrop: (entryId: string, setId: string, dropId: string) => void;

  // Superset creation from two existing straight blocks (v1 handleCreateSuperset :1336,
  // adapted to the v2 block model — merges both straight blocks into one superset block).
  createSuperset: (sourceEntryId: string, targetEntryId: string) => void;

  // Cardio block actions (w2c)
  addCardioBlock: (params: { exerciseId: string; exerciseName: string; cardio: CardioPayload }) => void;
  updateCardio: (blockId: string, cardio: Partial<CardioPayload>) => void;

  // Timer
  tickTimer: () => void;
  toggleTimer: () => void;
  // B1: Rest timer + pause (ported from v1)
  startRestTimer: (seconds: number) => void;
  tickRestTimer: () => void;
  resetRestTimer: () => void;
  pauseWorkoutTimer: () => void;
  resumeWorkoutTimer: () => void;

  // Hydration
  setHasHydrated: (v: boolean) => void;
}

export const useActiveWorkoutStore = create<ActiveWorkoutState>()(
  persist(
    (set, get) => ({
      activeWorkout: null,
      workoutTimerSeconds: 0,
      timerRunning: false,
      isFinishing: false,
      hasHydrated: false,
      activeBlockId: null,
      previousByExerciseId: {},
      restTimer: { isRunning: false, seconds: 0 }, // B1

      setPreviousBests: (map) => set({ previousByExerciseId: map }),

      setActiveBlock: (blockId) => set({ activeBlockId: blockId }),

      startWorkout: ({ userId, name }) => {
        set({
          activeWorkout: {
            id: newId(),
            userId,
            name: name || null,
            performedAt: new Date().toISOString(),
            blocks: [],
            totalVolume: 0,
            notes: null,
          },
          workoutTimerSeconds: 0,
          timerRunning: true,
          activeBlockId: null,
        });
      },

      cancelWorkout: () => {
        set({
          activeWorkout: null,
          workoutTimerSeconds: 0,
          timerRunning: false,
          isFinishing: false,
          activeBlockId: null,
        });
      },

      finishWorkout: async () => {
        const { activeWorkout } = get();
        if (!activeWorkout) return null;

        set({ isFinishing: true });

        // Compute total volume (G-13)
        const totalVolume = computeTotalVolume(activeWorkout.blocks);
        const final: LoggedWorkout = { ...activeWorkout, totalVolume };

        // Serialize + persist (G-11 await+retry)
        const row = toRow(final);
        const success = await persistWorkout(row);

        if (success) {
          set({
            activeWorkout: null,
            workoutTimerSeconds: 0,
            timerRunning: false,
            isFinishing: false,
            activeBlockId: null,
          });
          return final;
        } else {
          // Keep activeWorkout for retry
          set({ isFinishing: false });
          return null;
        }
      },

      // v1 addBlock (active/page.tsx:1030-1103): create an empty TYPED straight block,
      // append it, and make it the active block so the next addExercise lands inside it.
      // The picker is opened by the caller (page) — the store only owns state.
      addBlock: (blockType) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        const newBlock: WorkoutBlock = {
          id: newId(),
          kind: 'straight',
          blockType,
          exercises: [],
        };

        set({
          activeWorkout: {
            ...activeWorkout,
            blocks: [...activeWorkout.blocks, newBlock],
          },
          activeBlockId: newBlock.id,
        });
      },

      // v1 handleAddExercise (active/page.tsx:942-971): append the exercise to the ACTIVE
      // straight block (inheriting its blockType — no prompt). If no active straight block
      // exists (e.g. very first add), create a default 'strength' block to hold it.
      addExercise: ({ exerciseId, exerciseName }) => {
        const { activeWorkout, activeBlockId } = get();
        if (!activeWorkout) return;

        const newEntry: ExerciseEntry = {
          id: newId(),
          exerciseId,
          exerciseName,
          sets: [],
          notes: undefined,
        };

        const targetIdx = activeWorkout.blocks.findIndex(
          (b) => b.id === activeBlockId && b.kind === 'straight',
        );

        if (targetIdx !== -1) {
          const target = activeWorkout.blocks[targetIdx];
          if (target.kind !== 'straight') return;
          const updated = { ...target, exercises: [...target.exercises, newEntry] };
          const blocks = [...activeWorkout.blocks];
          blocks[targetIdx] = updated;
          set({ activeWorkout: { ...activeWorkout, blocks } });
          return;
        }

        // No active straight block → create a default 'strength' container (v1 fallback).
        // Deliberately does NOT set activeBlockId sticky: a bare addExercise (no block
        // chosen) behaves like the pre-parity "one block per exercise" quick-add. The
        // in-block / add-bar flows set the active block first (addBlock/setActiveBlock),
        // so those append into the same container.
        const newBlock: WorkoutBlock = {
          id: newId(),
          kind: 'straight',
          blockType: 'strength',
          exercises: [newEntry],
        };
        set({
          activeWorkout: {
            ...activeWorkout,
            blocks: [...activeWorkout.blocks, newBlock],
          },
        });
      },

      removeExercise: (entryId) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        set({
          activeWorkout: {
            ...activeWorkout,
            blocks: activeWorkout.blocks
              .map((block) => {
                if (block.kind === 'straight') {
                  const exercises = block.exercises.filter((e) => e.id !== entryId);
                  if (exercises.length === block.exercises.length) return block;
                  // Drop the block once its last exercise is removed (matches superset/circuit).
                  if (exercises.length < 1) return null;
                  return { ...block, exercises };
                }
                if (block.kind === 'superset') {
                  const exercises = block.exercises.filter((e) => e.id !== entryId);
                  if (exercises.length < 1) return null;
                  if (exercises.length === block.exercises.length) return block;
                  return { ...block, exercises };
                }
                if (block.kind === 'circuit') {
                  const stations = block.stations.filter((s) => s.id !== entryId);
                  if (stations.length < 1) return null;
                  if (stations.length === block.stations.length) return block;
                  return { ...block, stations };
                }
                return block;
              })
              .filter((b): b is WorkoutBlock => b !== null),
          },
        });
      },

      addSupersetBlock: (exercises) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;
        if (exercises.length < 2) return;

        const newBlock: WorkoutBlock = {
          id: newId(),
          kind: 'superset',
          exercises: exercises.map((ex) => ({
            id: newId(),
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            sets: [],
            notes: undefined,
          })),
        };

        set({
          activeWorkout: {
            ...activeWorkout,
            blocks: [...activeWorkout.blocks, newBlock],
          },
        });
      },

      addCircuitBlock: ({ stations, rounds, restSeconds }) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        const newBlock: WorkoutBlock = {
          id: newId(),
          kind: 'circuit',
          rounds,
          stations: stations.map((st) => ({
            id: newId(),
            exerciseId: st.exerciseId,
            exerciseName: st.exerciseName,
            sets: [],
            notes: undefined,
          })),
          ...(restSeconds !== undefined ? { restSeconds } : {}),
        };

        set({
          activeWorkout: {
            ...activeWorkout,
            blocks: [...activeWorkout.blocks, newBlock],
          },
        });
      },

      removeBlock: (blockId) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        set({
          activeWorkout: {
            ...activeWorkout,
            blocks: activeWorkout.blocks.filter((b) => b.id !== blockId),
          },
        });
      },

      addRound: (circuitBlockId) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        set({
          activeWorkout: {
            ...activeWorkout,
            blocks: activeWorkout.blocks.map((block) => {
              if (block.kind === 'circuit' && block.id === circuitBlockId) {
                const maxRound = block.stations.reduce((max, st) => {
                  const stMax = st.sets.reduce(
                    (sMax, s) => Math.max(sMax, s.roundIndex ?? -1),
                    -1,
                  );
                  return Math.max(max, stMax);
                }, -1);
                const nextRound = maxRound + 1;
                const nextSetNumber = nextRound + 1;

                const prevMap = get().previousByExerciseId;
                const stations = block.stations.map((st, stationIdx) => {
                  const lastSet = st.sets[st.sets.length - 1];
                  const prev = prevMap[st.exerciseId];
                  const newSet: LoggedSet = {
                    id: newId(),
                    setNumber: nextSetNumber,
                    weight: lastSet?.weight ?? null,
                    reps: lastSet?.reps ?? null,
                    completed: false,
                    roundIndex: nextRound,
                    stationIndex: stationIdx,
                    previousWeight: prev?.weight ?? null,
                    previousReps: prev?.reps ?? null,
                  };
                  return { ...st, sets: [...st.sets, newSet] };
                });
                return { ...block, stations };
              }
              return block;
            }),
          },
        });
      },

      addSet: (entryId) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        set({
          activeWorkout: {
            ...activeWorkout,
            blocks: mapEntry(activeWorkout.blocks, entryId, (entry) => {
              const lastSet = entry.sets[entry.sets.length - 1];
              const prev = get().previousByExerciseId[entry.exerciseId];
              const newSet: LoggedSet = {
                id: newId(),
                setNumber: entry.sets.length + 1,
                weight: lastSet?.weight ?? null,
                reps: lastSet?.reps ?? null,
                completed: false,
                previousWeight: prev?.weight ?? null,
                previousReps: prev?.reps ?? null,
              };
              return { ...entry, sets: [...entry.sets, newSet] };
            }),
          },
        });
      },

      removeSet: (entryId, setId) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        set({
          activeWorkout: {
            ...activeWorkout,
            blocks: mapEntry(activeWorkout.blocks, entryId, (entry) => ({
              ...entry,
              sets: entry.sets
                .filter((s) => s.id !== setId)
                .map((s, idx) => ({ ...s, setNumber: idx + 1 })),
            })),
          },
        });
      },

      updateSet: (entryId, setId, updates) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        set({
          activeWorkout: {
            ...activeWorkout,
            blocks: mapEntry(activeWorkout.blocks, entryId, (entry) => ({
              ...entry,
              sets: entry.sets.map((s) =>
                s.id === setId ? { ...s, ...updates } : s
              ),
            })),
          },
        });
      },

      completeSet: (entryId, setId) => {
        const { updateSet } = get();
        // w2a: drop PB detection (w3)
        updateSet(entryId, setId, { completed: true });
      },

      uncompleteSet: (entryId, setId) => {
        const { updateSet } = get();
        updateSet(entryId, setId, { completed: false });
      },

      // Faithful port of v1 handleAddDropSet (active/page.tsx:1322): append ONE drop row
      // to EVERY set of the exercise. Drops default to 0/0 and are edited inline (v1 :6383).
      addDropSet: (entryId) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        set({
          activeWorkout: {
            ...activeWorkout,
            blocks: mapEntry(activeWorkout.blocks, entryId, (entry) => ({
              ...entry,
              sets: entry.sets.map((s) => ({
                ...s,
                drops: [...(s.drops ?? []), { id: newId(), weight: 0, reps: 0 }],
              })),
            })),
          },
        });
      },

      updateDrop: (entryId, setId, dropId, updates) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        set({
          activeWorkout: {
            ...activeWorkout,
            blocks: mapEntry(activeWorkout.blocks, entryId, (entry) => ({
              ...entry,
              sets: entry.sets.map((s) =>
                s.id === setId
                  ? {
                      ...s,
                      drops: (s.drops ?? []).map((d) =>
                        d.id === dropId ? { ...d, ...updates } : d,
                      ),
                    }
                  : s,
              ),
            })),
          },
        });
      },

      removeDrop: (entryId, setId, dropId) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        set({
          activeWorkout: {
            ...activeWorkout,
            blocks: mapEntry(activeWorkout.blocks, entryId, (entry) => ({
              ...entry,
              sets: entry.sets.map((s) =>
                s.id === setId
                  ? { ...s, drops: (s.drops ?? []).filter((d) => d.id !== dropId) }
                  : s,
              ),
            })),
          },
        });
      },

      // Faithful port of v1 handleCreateSuperset (active/page.tsx:1336). v1 tagged two flat
      // exercises with a shared groupId; the v2 block model represents a superset as a
      // first-class block. Straight blocks are now multi-exercise containers, so we PULL the
      // two chosen exercises out of their straight block(s), drop any now-empty straight
      // block, and insert a new superset block where the first affected block sat (parity:
      // a trainer-authored superset renders identically). No-op unless BOTH entries live in
      // straight blocks.
      createSuperset: (sourceEntryId, targetEntryId) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;
        if (sourceEntryId === targetEntryId) return;

        const blocks = activeWorkout.blocks;

        const findEntry = (id: string): ExerciseEntry | undefined => {
          for (const b of blocks) {
            if (b.kind !== 'straight') continue;
            const e = b.exercises.find((x) => x.id === id);
            if (e) return e;
          }
          return undefined;
        };

        const srcEntry = findEntry(sourceEntryId);
        const tgtEntry = findEntry(targetEntryId);
        if (!srcEntry || !tgtEntry) return;

        const supersetBlock: WorkoutBlock = {
          id: newId(),
          kind: 'superset',
          exercises: [srcEntry, tgtEntry],
        };

        // Rebuild the block list: strip the two entries from straight blocks (dropping any
        // block left empty), remembering where the first affected block was so we can splice
        // the new superset back in at that spot.
        let insertionIndex = -1;
        const rebuilt: WorkoutBlock[] = [];
        for (const b of blocks) {
          if (b.kind === 'straight') {
            const remaining = b.exercises.filter(
              (e) => e.id !== sourceEntryId && e.id !== targetEntryId,
            );
            if (remaining.length !== b.exercises.length && insertionIndex === -1) {
              insertionIndex = rebuilt.length; // first block that lost an exercise
            }
            if (remaining.length > 0) rebuilt.push({ ...b, exercises: remaining });
            continue;
          }
          rebuilt.push(b);
        }
        if (insertionIndex === -1) insertionIndex = rebuilt.length;
        rebuilt.splice(insertionIndex, 0, supersetBlock);

        set({
          activeWorkout: { ...activeWorkout, blocks: rebuilt },
        });
      },

      addCardioBlock: ({ exerciseId, exerciseName, cardio }) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        const newBlock: WorkoutBlock = {
          id: newId(),
          kind: 'cardio',
          exerciseId,
          exerciseName,
          cardio,
        };

        set({
          activeWorkout: {
            ...activeWorkout,
            blocks: [...activeWorkout.blocks, newBlock],
          },
        });
      },

      updateCardio: (blockId, cardioUpdates) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        set({
          activeWorkout: {
            ...activeWorkout,
            blocks: activeWorkout.blocks.map((block) =>
              block.kind === 'cardio' && block.id === blockId
                ? { ...block, cardio: { ...block.cardio, ...cardioUpdates } }
                : block
            ),
          },
        });
      },

      tickTimer: () => {
        const { timerRunning, workoutTimerSeconds } = get();
        if (timerRunning) {
          set({ workoutTimerSeconds: workoutTimerSeconds + 1 });
        }
      },

      toggleTimer: () => {
        set((state) => ({ timerRunning: !state.timerRunning }));
      },

      // B1: Rest timer + pause (ported from v1 workoutStore.ts)
      startRestTimer: (seconds: number) => {
        set({ restTimer: { isRunning: true, seconds } });
      },

      tickRestTimer: () => {
        const { restTimer } = get();
        if (!restTimer.isRunning) return;
        if (restTimer.seconds <= 1) {
          set({ restTimer: { isRunning: false, seconds: 0 } });
        } else {
          set({ restTimer: { ...restTimer, seconds: restTimer.seconds - 1 } });
        }
      },

      resetRestTimer: () => {
        set({ restTimer: { isRunning: false, seconds: 0 } });
      },

      pauseWorkoutTimer: () => {
        set({ timerRunning: false });
      },

      resumeWorkoutTimer: () => {
        set({ timerRunning: true });
      },

      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      // G-03: IndexedDB key (TODO: user-scoped via userScopedKey when auth is wired)
      name: 'catalift-active-workout',
      // No explicit generic: the persisted shape is inferred from `partialize` below.
      storage: createJSONStorage(() => {
        // G-03: IndexedDB for bulky workout payload (auth tokens stay in localStorage)
        const idbStorage: StateStorage = {
          getItem: async (key: string) => {
            const value = await getIdbItem<string>(key);
            return value ?? null;
          },
          setItem: async (key: string, value: string) => {
            await setIdbItem(key, value);
          },
          removeItem: async (key: string) => {
            await removeIdbItem(key);
          },
        };
        return idbStorage;
      }),
      // Persist only the in-progress workout + timer. previousByExerciseId is derived
      // from Supabase (RLS-scoped) and re-seeded on mount, so it is deliberately NOT
      // persisted — this keeps derived, potentially cross-account data out of IDB.
      partialize: (state) => ({
        activeWorkout: state.activeWorkout,
        workoutTimerSeconds: state.workoutTimerSeconds,
        timerRunning: state.timerRunning,
        restTimer: state.restTimer, // B1: persist rest timer
        activeBlockId: state.activeBlockId, // keep in-block "Add Exercise" target across reloads
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
