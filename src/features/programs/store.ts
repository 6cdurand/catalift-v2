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

import { create } from "zustand";

import { mergeById } from "@/features/data-sync";
import type { ClientProgram, SavedProgram } from "./types";

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

  reset: () => set({ savedPrograms: [], clientPrograms: [] }),
}));
