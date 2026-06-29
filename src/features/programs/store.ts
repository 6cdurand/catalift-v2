// Programs store (Programs Wave 1).
//
// Separate store per resource (G-16) — program state lives here, NOT crammed into
// a god trainerStore as in v1. Plain Zustand `create` with NO persist middleware:
// program data is never written to the browser's local-storage cache (no legacy
// v1 program-library localStorage key). The DB is the source of truth for persistence; this
// store is the source of truth for UI state.
//
// Hydration MERGES by id (G-09) via data-sync's `mergeById`: an empty or partial
// server fetch can never wipe local rows or clobber in-flight writes.
//
// w2b-1 additions: builderDays / activeDayIndex + granular day/block/exercise
// mutators. These power the Build Days step of the program builder wizard.
// All mutations use crypto.randomUUID() (G-10) and immutable array updates.

import { create } from "zustand";

import { mergeById } from "@/features/data-sync";
import type {
  BlockType,
  ClientProgram,
  ProgramBlock,
  ProgramDay,
  ProgramExercise,
  MovementPattern,
  SavedProgram,
  ScheduleMode,
  Weekday,
} from "./types";

// ── Block type ordering (ported from v1 WorkoutDayBuilder sortBlocks) ──
const BLOCK_ORDER: Record<BlockType, number> = {
  warmup: 0,
  work: 1,
  circuit: 2,
  cardio: 3,
  cooldown: 4,
};

function sortBlocks(blocks: ProgramBlock[]): ProgramBlock[] {
  return [...blocks].sort((a, b) => (BLOCK_ORDER[a.type] ?? 99) - (BLOCK_ORDER[b.type] ?? 99));
}

function categoryToMovementPattern(category: string): MovementPattern {
  if (category === "cardio" || category === "warmup" || category === "stretching" || category === "activation") {
    return "cardio";
  }
  if (category === "bodyweight") return "bodyweight";
  if (category === "isolation") return "isolation";
  return "compound";
}

function defaultBlockName(type: BlockType): string {
  switch (type) {
    case "warmup": return "Warm-up";
    case "work": return "Main Lifts";
    case "circuit": return "Circuit";
    case "cardio": return "Cardio";
    case "cooldown": return "Cool-down";
    default: return "Block";
  }
}

function makeExercise(
  exercise: { id: string; name: string; pattern: string },
  blockType: BlockType,
): ProgramExercise {
  const isTimeBased = exercise.pattern === "warmup" || exercise.pattern === "cardio";
  const isCircuitBlock = blockType === "circuit";
  return {
    id: crypto.randomUUID(),
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    movementPattern: categoryToMovementPattern(exercise.pattern),
    sets: isCircuitBlock ? 1 : 3,
    reps: isTimeBased ? "30s" : "8-12",
    rest: isCircuitBlock ? "0s" : "60s",
    repType: isTimeBased ? "time" : "reps",
    setStyle: "fixed",
  };
}

export interface ProgramsState {
  savedPrograms: SavedProgram[];
  clientPrograms: ClientProgram[];

  /** Merge a server fetch of saved programs into local state (never replaces). */
  hydrateSavedPrograms: (incoming: SavedProgram[]) => void;
  /** Merge a server fetch of client programs into local state (never replaces). */
  hydrateClientPrograms: (incoming: ClientProgram[]) => void;

  /** Insert or update a single saved program locally (after a confirmed write). */
  upsertSavedProgram: (program: SavedProgram) => void;
  /** Insert or update a single client program locally (after a confirmed write). */
  upsertClientProgram: (program: ClientProgram) => void;

  /** Remove a saved program locally (after a confirmed delete). */
  removeSavedProgram: (id: string) => void;
  /** Remove a client program locally (after a confirmed delete). */
  removeClientProgram: (id: string) => void;

  /** Drop all program state (e.g. on logout). */
  reset: () => void;

  // ── Builder state (w2b-1) ──────────────────────────────────────
  /** Days array for the active program builder session (single source of truth). */
  builderDays: ProgramDay[];
  /** Index of the currently active day tab in the builder. */
  activeDayIndex: number;

  /** Replace the entire builder days array. */
  setDays: (days: ProgramDay[]) => void;
  /** Set the active day tab index. */
  setActiveDayIndex: (index: number) => void;
  /** Update a day's label by index. */
  updateDayLabel: (index: number, label: string) => void;
  /** Append a new empty day to the builder. */
  addDay: () => void;
  /** Deep-copy a day (new UUIDs for day + blocks + exercises) and append it. */
  copyDay: (fromIndex: number) => void;
  /** Remove a day by index (minimum 1 day enforced). */
  removeDay: (index: number) => void;
  /** Add a block of the given type to the specified day. */
  addBlock: (dayIdx: number, type: BlockType) => void;
  /** Remove a block by ID (searches all days). */
  removeBlock: (blockId: string) => void;
  /** Update a block's name by ID (searches all days). */
  updateBlockName: (blockId: string, name: string) => void;
  /** Add an exercise to a block by ID (searches all days). */
  addExerciseToBlock: (blockId: string, exercise: { id: string; name: string; pattern: string }) => void;
  /** Remove an exercise from a block by IDs (searches all days). */
  removeExercise: (blockId: string, exerciseId: string) => void;
  /** Partially update an exercise within a block by IDs (searches all days). */
  updateExercise: (blockId: string, exerciseId: string, updates: Partial<ProgramExercise>) => void;
  /** Clear builder state. */
  resetBuilder: () => void;

  // ── Schedule state (w2c-1) ─────────────────────────────────────
  /** Schedule mode for the active builder session. */
  builderScheduleMode: ScheduleMode;
  /** Selected weekdays for fixed-schedule mode. */
  builderSelectedDays: Weekday[];
  /** Training frequency (sessions/week) for flexible mode. */
  builderTrainingFrequency: number;
  /** PT/personal session type per slot index. */
  builderSessionPTMap: Record<number, "pt" | "personal">;
  /** Program start date (ISO YYYY-MM-DD). */
  builderStartDate: string;

  /** Set the schedule mode. */
  setScheduleMode: (mode: ScheduleMode) => void;
  /** Toggle a weekday in the selected days list (sorted by WEEKDAYS order). */
  toggleSelectedDay: (day: Weekday) => void;
  /** Set the training frequency. */
  setTrainingFrequency: (freq: number) => void;
  /** Toggle a session's PT/personal type by slot index. */
  toggleSessionPT: (slotIdx: number) => void;
  /** Set the program start date. */
  setBuilderStartDate: (date: string) => void;
}

export const useProgramsStore = create<ProgramsState>((set) => ({
  savedPrograms: [],
  clientPrograms: [],

  hydrateSavedPrograms: (incoming) =>
    set((state) => ({
      savedPrograms: mergeById(state.savedPrograms, incoming),
    })),

  hydrateClientPrograms: (incoming) =>
    set((state) => ({
      clientPrograms: mergeById(state.clientPrograms, incoming),
    })),

  upsertSavedProgram: (program) =>
    set((state) => ({
      savedPrograms: mergeById(state.savedPrograms, [program]),
    })),

  upsertClientProgram: (program) =>
    set((state) => ({
      clientPrograms: mergeById(state.clientPrograms, [program]),
    })),

  removeSavedProgram: (id) =>
    set((state) => ({
      savedPrograms: state.savedPrograms.filter((p) => p.id !== id),
    })),

  removeClientProgram: (id) =>
    set((state) => ({
      clientPrograms: state.clientPrograms.filter((p) => p.id !== id),
    })),

  reset: () => set({ savedPrograms: [], clientPrograms: [], builderDays: [], activeDayIndex: 0 }),

  // ── Builder mutators (w2b-1) ───────────────────────────────────
  builderDays: [],
  activeDayIndex: 0,

  setDays: (days) => set({ builderDays: days }),

  setActiveDayIndex: (index) => set({ activeDayIndex: index }),

  updateDayLabel: (index, label) =>
    set((state) => ({
      builderDays: state.builderDays.map((d, i) => (i === index ? { ...d, label } : d)),
    })),

  addDay: () =>
    set((state) => ({
      builderDays: [
        ...state.builderDays,
        {
          id: crypto.randomUUID(),
          label: `Day ${String.fromCharCode(65 + state.builderDays.length)}`,
          blocks: [],
        },
      ],
    })),

  copyDay: (fromIndex) =>
    set((state) => {
      const source = state.builderDays[fromIndex];
      if (!source) return state;
      const copy: ProgramDay = {
        id: crypto.randomUUID(),
        label: `${source.label} (Copy)`,
        scheduledDay: source.scheduledDay,
        blocks: source.blocks.map((b) => ({
          id: crypto.randomUUID(),
          type: b.type,
          name: b.name,
          exercises: b.exercises.map((ex) => ({
            ...ex,
            id: crypto.randomUUID(),
          })),
        })),
      };
      return { builderDays: [...state.builderDays, copy] };
    }),

  removeDay: (index) =>
    set((state) => {
      if (state.builderDays.length <= 1) return state;
      const newDays = state.builderDays.filter((_, i) => i !== index);
      const newIndex = Math.min(state.activeDayIndex, newDays.length - 1);
      return { builderDays: newDays, activeDayIndex: newIndex };
    }),

  addBlock: (dayIdx, type) =>
    set((state) => ({
      builderDays: state.builderDays.map((d, i) => {
        if (i !== dayIdx) return d;
        const newBlock: ProgramBlock = {
          id: crypto.randomUUID(),
          type,
          name: defaultBlockName(type),
          exercises: [],
        };
        return { ...d, blocks: sortBlocks([...d.blocks, newBlock]) };
      }),
    })),

  removeBlock: (blockId) =>
    set((state) => ({
      builderDays: state.builderDays.map((d) => ({
        ...d,
        blocks: d.blocks.filter((b) => b.id !== blockId),
      })),
    })),

  updateBlockName: (blockId, name) =>
    set((state) => ({
      builderDays: state.builderDays.map((d) => ({
        ...d,
        blocks: d.blocks.map((b) => (b.id === blockId ? { ...b, name } : b)),
      })),
    })),

  addExerciseToBlock: (blockId, exercise) =>
    set((state) => ({
      builderDays: state.builderDays.map((d) => ({
        ...d,
        blocks: d.blocks.map((b) => {
          if (b.id !== blockId) return b;
          return { ...b, exercises: [...b.exercises, makeExercise(exercise, b.type)] };
        }),
      })),
    })),

  removeExercise: (blockId, exerciseId) =>
    set((state) => ({
      builderDays: state.builderDays.map((d) => ({
        ...d,
        blocks: d.blocks.map((b) => {
          if (b.id !== blockId) return b;
          return { ...b, exercises: b.exercises.filter((ex) => ex.id !== exerciseId) };
        }),
      })),
    })),

  updateExercise: (blockId, exerciseId, updates) =>
    set((state) => ({
      builderDays: state.builderDays.map((d) => ({
        ...d,
        blocks: d.blocks.map((b) => {
          if (b.id !== blockId) return b;
          return {
            ...b,
            exercises: b.exercises.map((ex) =>
              ex.id === exerciseId ? { ...ex, ...updates } : ex,
            ),
          };
        }),
      })),
    })),

  resetBuilder: () => set({
    builderDays: [],
    activeDayIndex: 0,
    builderScheduleMode: "fixed",
    builderSelectedDays: [],
    builderTrainingFrequency: 3,
    builderSessionPTMap: {},
    builderStartDate: new Date().toISOString().split("T")[0],
  }),

  // ── Schedule state (w2c-1) ─────────────────────────────────────
  builderScheduleMode: "fixed",
  builderSelectedDays: [],
  builderTrainingFrequency: 3,
  builderSessionPTMap: {},
  builderStartDate: new Date().toISOString().split("T")[0],

  setScheduleMode: (mode) => set({ builderScheduleMode: mode }),

  toggleSelectedDay: (day) =>
    set((state) => {
      const WEEKDAYS: Weekday[] = [
        "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
      ];
      const isSelected = state.builderSelectedDays.includes(day);
      const next = isSelected
        ? state.builderSelectedDays.filter((d) => d !== day)
        : [...state.builderSelectedDays, day].sort(
            (a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b),
          );
      return { builderSelectedDays: next };
    }),

  setTrainingFrequency: (freq) => set({ builderTrainingFrequency: freq }),

  toggleSessionPT: (slotIdx) =>
    set((state) => {
      const current = state.builderSessionPTMap[slotIdx];
      return {
        builderSessionPTMap: {
          ...state.builderSessionPTMap,
          [slotIdx]: current === "pt" ? "personal" : "pt",
        },
      };
    }),

  setBuilderStartDate: (date) => set({ builderStartDate: date }),
}));
