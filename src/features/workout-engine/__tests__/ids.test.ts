import { describe, it, expect } from "vitest";

import { newId, isValidUuid, assertValidWorkout } from "../lib/ids";
import type { WorkoutBlock } from "../types";

describe("ids — G-10 uuid guard", () => {
  it("valid: newId() passes isValidUuid", () => {
    expect(isValidUuid(newId())).toBe(true);
  });

  it("reject: assertValidWorkout throws on a non-uuid workout id (v1 22P02 class)", () => {
    expect(() =>
      assertValidWorkout({ id: "local-123", blocks: [] }),
    ).toThrow(/invalid workout id/i);
  });

  it("reject: throws on a non-uuid nested set id", () => {
    const block: WorkoutBlock = {
      id: newId(),
      kind: "straight",
      blockType: "strength",
      exercises: [
        {
          id: newId(),
          exerciseId: newId(),
          exerciseName: "Squat",
          sets: [{ id: "local-set-1", weight: 100, reps: 5, completed: true, setNumber: 1 }],
        },
      ],
    };
    expect(() =>
      assertValidWorkout({ id: newId(), blocks: [block] }),
    ).toThrow(/invalid/i);
  });

  it("passes a fully uuid-keyed workout tree", () => {
    const block: WorkoutBlock = {
      id: newId(),
      kind: "circuit",
      rounds: 1,
      stations: [
        {
          id: newId(),
          exerciseId: newId(),
          exerciseName: "Burpee",
          sets: [{ id: newId(), weight: null, reps: 10, completed: true, setNumber: 1 }],
        },
      ],
    };
    expect(() =>
      assertValidWorkout({ id: newId(), blocks: [block] }),
    ).not.toThrow();
  });
});
