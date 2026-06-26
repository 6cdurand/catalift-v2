import { describe, it, expect } from "vitest";

import { computeBlockVolume } from "../lib/volume";
import { newId } from "../lib/ids";
import type { ExerciseEntry, LoggedSet, WorkoutBlock } from "../types";

/**
 * The v1 fix: a circuit station's sets[] holds ONE LoggedSet per round, addressable by
 * (roundIndex, stationIndex), so weight & reps ARE tracked per station per round.
 */
function station(
  stationIndex: number,
  rounds: number,
  build: (round: number) => Partial<LoggedSet>,
): ExerciseEntry {
  return {
    id: newId(),
    exerciseId: newId(),
    exerciseName: `Station ${stationIndex}`,
    sets: Array.from({ length: rounds }, (_, round) => ({
      id: newId(),
      weight: null,
      reps: null,
      completed: true,
      roundIndex: round,
      stationIndex,
      ...build(round),
    })),
  };
}

describe("circuit — the v1 fix", () => {
  it("per-station-per-round: each station has one set per round addressable by (roundIndex, stationIndex) carrying weight+reps", () => {
    const rounds = 3;
    const block: WorkoutBlock = {
      id: newId(),
      kind: "circuit",
      rounds,
      stations: [
        station(0, rounds, () => ({ weight: 20, reps: 10 })),
        station(1, rounds, () => ({ weight: 30, reps: 8 })),
      ],
    };

    expect(block.kind).toBe("circuit");
    if (block.kind !== "circuit") return;

    expect(block.stations).toHaveLength(2);
    for (const [stationIndex, st] of block.stations.entries()) {
      expect(st.sets).toHaveLength(rounds);
      for (let round = 0; round < rounds; round++) {
        const match = st.sets.find(
          (s) => s.roundIndex === round && s.stationIndex === stationIndex,
        );
        expect(match).toBeDefined();
        expect(typeof match!.weight).toBe("number");
        expect(typeof match!.reps).toBe("number");
      }
    }
  });

  it("timed-station: a station logged by durationSeconds (no weight/reps) is valid and adds 0 weight-volume", () => {
    const block: WorkoutBlock = {
      id: newId(),
      kind: "circuit",
      rounds: 2,
      stations: [
        station(0, 2, (round) => ({
          weight: null,
          reps: null,
          durationSeconds: 30 + round,
        })),
      ],
    };

    if (block.kind !== "circuit") throw new Error("expected circuit");
    const timed = block.stations[0].sets;
    expect(timed.every((s) => s.weight === null && s.reps === null)).toBe(true);
    expect(timed.every((s) => typeof s.durationSeconds === "number")).toBe(true);
    expect(computeBlockVolume(block)).toBe(0);
  });
});
