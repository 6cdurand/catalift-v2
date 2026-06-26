// Active workout store \u2014 Zustand state for the in-progress LoggedWorkout (w2a).
// Ports v1's workoutStore.ts set-manipulation actions, adapted to v2 blocks + types.
// Persists in IndexedDB under user-scoped key; finishWorkout serializes + persists via data-sync (G-11).

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';
import type { LoggedWorkout, WorkoutBlock, LoggedSet } from '../types';
import { newId } from '../lib/ids';
import { computeTotalVolume } from '../lib/volume';
import { toRow } from '../lib/serialize';
import { persist as persistWorkout } from '../api/persist';
import { getIdbItem, setIdbItem, removeIdbItem } from '@/lib/storage';

interface ActiveWorkoutState {
  activeWorkout: LoggedWorkout | null;
  workoutTimerSeconds: number;
  timerRunning: boolean;
  isFinishing: boolean;
  hasHydrated: boolean;

  // Lifecycle
  startWorkout: (params: { userId: string; name?: string }) => void;
  cancelWorkout: () => void;
  finishWorkout: () => Promise<LoggedWorkout | null>;

  // Exercise actions (operate on blocks)
  addExercise: (exercise: { exerciseId: string; exerciseName: string }) => void;
  removeExercise: (entryId: string) => void;

  // Set actions
  addSet: (entryId: string) => void;
  removeSet: (entryId: string, setId: string) => void;
  updateSet: (entryId: string, setId: string, updates: Partial<LoggedSet>) => void;
  completeSet: (entryId: string, setId: string) => void;
  uncompleteSet: (entryId: string, setId: string) => void;

  // Timer
  tickTimer: () => void;
  toggleTimer: () => void;

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
        });
      },

      cancelWorkout: () => {
        set({
          activeWorkout: null,
          workoutTimerSeconds: 0,
          timerRunning: false,
          isFinishing: false,
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
          });
          return final;
        } else {
          // Keep activeWorkout for retry
          set({ isFinishing: false });
          return null;
        }
      },

      addExercise: ({ exerciseId, exerciseName }) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        const newBlock: WorkoutBlock = {
          id: newId(),
          kind: 'straight',
          exercise: {
            id: newId(),
            exerciseId,
            exerciseName,
            sets: [],
            notes: undefined,
          },
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
            blocks: activeWorkout.blocks.filter((block) => {
              if (block.kind === 'straight') {
                return block.exercise.id !== entryId;
              }
              return true; // w2a: only straight blocks
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
            blocks: activeWorkout.blocks.map((block) => {
              if (block.kind === 'straight' && block.exercise.id === entryId) {
                const lastSet = block.exercise.sets[block.exercise.sets.length - 1];
                const newSet: LoggedSet = {
                  id: newId(),
                  setNumber: block.exercise.sets.length + 1,
                  weight: lastSet?.weight ?? null,
                  reps: lastSet?.reps ?? null,
                  completed: false,
                  // w2a: no history lookup (w3 will wire this)
                  previousWeight: null,
                  previousReps: null,
                };
                return {
                  ...block,
                  exercise: {
                    ...block.exercise,
                    sets: [...block.exercise.sets, newSet],
                  },
                };
              }
              return block;
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
            blocks: activeWorkout.blocks.map((block) => {
              if (block.kind === 'straight' && block.exercise.id === entryId) {
                const updated = block.exercise.sets
                  .filter((s) => s.id !== setId)
                  .map((s, idx) => ({ ...s, setNumber: idx + 1 }));
                return {
                  ...block,
                  exercise: { ...block.exercise, sets: updated },
                };
              }
              return block;
            }),
          },
        });
      },

      updateSet: (entryId, setId, updates) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        set({
          activeWorkout: {
            ...activeWorkout,
            blocks: activeWorkout.blocks.map((block) => {
              if (block.kind === 'straight' && block.exercise.id === entryId) {
                return {
                  ...block,
                  exercise: {
                    ...block.exercise,
                    sets: block.exercise.sets.map((s) =>
                      s.id === setId ? { ...s, ...updates } : s
                    ),
                  },
                };
              }
              return block;
            }),
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

      tickTimer: () => {
        const { timerRunning, workoutTimerSeconds } = get();
        if (timerRunning) {
          set({ workoutTimerSeconds: workoutTimerSeconds + 1 });
        }
      },

      toggleTimer: () => {
        set((state) => ({ timerRunning: !state.timerRunning }));
      },

      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      // G-03: IndexedDB key (TODO: user-scoped via userScopedKey when auth is wired)
      name: 'catalift-active-workout',
      storage: createJSONStorage<ActiveWorkoutState>(() => {
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
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
