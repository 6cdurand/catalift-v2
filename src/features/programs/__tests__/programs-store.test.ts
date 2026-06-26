import { describe, it, expect, beforeEach } from "vitest";

import { useProgramsStore } from "../store";
import type { SavedProgram } from "../types";

function saved(id: string, name: string): SavedProgram {
  return {
    id,
    trainerId: "trainer-1",
    name,
    phase: "none",
    goals: [],
    durationWeeks: 4,
    daysPerWeek: 3,
    autoRepeat: false,
    days: [],
    timesAssigned: 0,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
}

beforeEach(() => {
  useProgramsStore.getState().reset();
});

describe("useProgramsStore hydration (G-09)", () => {
  it("hydrate-merge: a partial server payload keeps local-only rows and updates matched ones", () => {
    const store = useProgramsStore.getState();
    // Local state: one in-flight local-only row + one row also on the server.
    store.upsertSavedProgram(saved("local-only", "Just Saved Locally"));
    store.upsertSavedProgram(saved("server-1", "Stale Name"));

    // Server fetch returns only server-1, with a fresher name.
    store.hydrateSavedPrograms([saved("server-1", "Fresh Name")]);

    const rows = useProgramsStore.getState().savedPrograms;
    expect(rows.find((r) => r.id === "local-only")?.name).toBe(
      "Just Saved Locally",
    );
    expect(rows.find((r) => r.id === "server-1")?.name).toBe("Fresh Name");
    expect(rows).toHaveLength(2);
  });

  it("hydrate-empty: an empty server response does NOT wipe local state", () => {
    const store = useProgramsStore.getState();
    store.upsertSavedProgram(saved("local-1", "One"));
    store.upsertSavedProgram(saved("local-2", "Two"));

    store.hydrateSavedPrograms([]);

    expect(useProgramsStore.getState().savedPrograms).toHaveLength(2);
  });
});
