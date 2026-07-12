import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  clientProgramToRow,
  rowToClientProgram,
} from "../../lib/serialize";
import { deriveCompletedDayIndices } from "../../lib/derive-completed-days";
import { getNextProgramWorkout } from "../../lib/get-next-workout";
import type { ClientProgram } from "../../types";
import type { Database } from "@/types/database";

type ClientRow = Database["public"]["Tables"]["client_programs"]["Row"];

// ─────────────────────────────────────────────────────────────────────────────
// A program EXACTLY as a trainer would author + assign it (w2 → client_programs).
// Two days, multiple blocks, full prescription (sets × reps × rest × tempo).
// ─────────────────────────────────────────────────────────────────────────────
function trainerAuthoredProgram(): ClientProgram {
  return {
    id: "prog-1",
    clientId: "client-1",
    trainerId: "trainer-1",
    name: "Hypertrophy Block 1",
    status: "active",
    phase: "hypertrophy",
    goal: "hypertrophy",
    weeklyPlan: [
      {
        id: "day-1",
        label: "Push",
        scheduledDay: "monday",
        blocks: [
          {
            id: "block-1",
            type: "warmup",
            name: "Activation",
            exercises: [
              {
                id: "ex-0",
                exerciseId: "ex-id-0",
                exerciseName: "Band Pull-Apart",
                movementPattern: "bodyweight",
                sets: 2,
                reps: "15",
                rest: "30s",
                tempo: "1010",
              },
            ],
          },
          {
            id: "block-2",
            type: "work",
            name: "Main Lifts",
            exercises: [
              {
                id: "ex-1",
                exerciseId: "ex-id-1",
                exerciseName: "Bench Press",
                movementPattern: "compound",
                sets: 4,
                reps: "6-8",
                rest: "120s",
                tempo: "3110",
                notes: "Leave 1 RIR",
              },
              {
                id: "ex-2",
                exerciseId: "ex-id-2",
                exerciseName: "Overhead Press",
                movementPattern: "compound",
                sets: 3,
                reps: "8-10",
                rest: "90s",
                tempo: "2010",
              },
            ],
          },
        ],
      },
      {
        id: "day-2",
        label: "Pull",
        scheduledDay: "thursday",
        blocks: [
          {
            id: "block-3",
            type: "work",
            name: "Back",
            exercises: [
              {
                id: "ex-3",
                exerciseId: "ex-id-3",
                exerciseName: "Deadlift",
                movementPattern: "compound",
                sets: 3,
                reps: "5",
                rest: "180s",
                tempo: "X111",
              },
            ],
          },
        ],
      },
    ],
    scheduleMode: "fixed",
    trainingDaysPerWeek: 2,
    selectedDays: ["monday", "thursday"],
    cycleAcrossWeeks: false,
    sessionPTMap: { 0: "pt" },
    nextWorkoutIndex: 0,
    autoRepeat: false,
    startDate: "2026-01-05",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

/** Simulate the DB round-trip: trainer WRITE (assign) → client READ (fetch). */
function roundTripAsClientWouldRead(program: ClientProgram): ClientProgram {
  const insert = clientProgramToRow(program);
  const row: ClientRow = {
    ...insert,
    // scalar columns the DB fills / returns on read
    created_at: program.createdAt,
    updated_at: program.updatedAt,
    start_date: insert.start_date ?? null,
    end_date: insert.end_date ?? null,
    status: insert.status ?? "active",
    next_workout_index: insert.next_workout_index ?? 0,
  } as ClientRow;
  return rowToClientProgram(row);
}

describe("cross-account parity — client reads exactly what the trainer wrote", () => {
  it("preserves days, block order, and every set × reps × rest × tempo", () => {
    const authored = trainerAuthoredProgram();
    const asClientSees = roundTripAsClientWouldRead(authored);

    // Same day count + labels + order
    expect(asClientSees.weeklyPlan.map((d) => d.label)).toEqual(["Push", "Pull"]);

    // Deep parity on the prescription itself
    expect(asClientSees.weeklyPlan).toEqual(authored.weeklyPlan);

    // Spot-check the exact numbers the client will train to
    const bench = asClientSees.weeklyPlan[0].blocks[1].exercises[0];
    expect(bench.exerciseName).toBe("Bench Press");
    expect(bench.sets).toBe(4);
    expect(bench.reps).toBe("6-8");
    expect(bench.rest).toBe("120s");
    expect(bench.tempo).toBe("3110");
  });

  it("preserves schedule (mode + selected days + PT map)", () => {
    const authored = trainerAuthoredProgram();
    const asClientSees = roundTripAsClientWouldRead(authored);

    expect(asClientSees.scheduleMode).toBe("fixed");
    expect(asClientSees.selectedDays).toEqual(["monday", "thursday"]);
    expect(asClientSees.sessionPTMap).toEqual({ 0: "pt" });
    expect(asClientSees.trainingDaysPerWeek).toBe(2);
  });
});

describe('"Up Next" comes ONLY from getNextProgramWorkout (BUG-001/010 divergence guard)', () => {
  it("produces the identical next-workout result before and after the DB round-trip", () => {
    const authored = trainerAuthoredProgram();
    const asClientSees = roundTripAsClientWouldRead(authored);

    // Monday, nothing completed → fixed mode anchors to Monday (Push, index 0)
    const monday = new Date("2026-01-05T08:00:00"); // a Monday
    const completed = deriveCompletedDayIndices(asClientSees, []);
    const next = getNextProgramWorkout(asClientSees, completed, [], monday);
    const nextFromAuthored = getNextProgramWorkout(authored, [], [], monday);

    expect(next).toEqual(nextFromAuthored);
    expect(next.dayIndex).toBe(0);
    expect(next.day?.label).toBe("Push");
    expect(next.remainingThisWeek).toBe(2);
  });

  it("advances to the next scheduled day once the client completes today", () => {
    const program = trainerAuthoredProgram();
    const monday = new Date("2026-01-05T08:00:00");

    // Client trained Monday → Push (index 0) is complete.
    const completed = deriveCompletedDayIndices(program, ["2026-01-05"]);
    expect(completed).toEqual([0]);

    const next = getNextProgramWorkout(program, completed, [], monday);
    expect(next.dayIndex).toBe(1); // Pull (Thursday) is up next
    expect(next.day?.label).toBe("Pull");
    expect(next.remainingThisWeek).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GREP-GUARD: no independent next-day/rotation math may live in client/.
// getNextProgramWorkout may be CALLED in exactly one place (the data hook); any
// weekday arithmetic (.getDay) or pointer-advancing (nextWorkoutIndex) is banned.
// This is the structural defence against the "Today says pull / Program says
// legs" divergence class.
// ─────────────────────────────────────────────────────────────────────────────
describe("grep-guard: no next-day logic inside features/programs/client/", () => {
  const CLIENT_DIR = resolve(__dirname, "..");
  const CODE_EXT = /\.(ts|tsx)$/;

  function collect(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "__tests__") continue;
        out.push(...collect(full));
      } else if (CODE_EXT.test(entry.name) && !entry.name.includes(".test.")) {
        out.push(full);
      }
    }
    return out;
  }

  const files = collect(CLIENT_DIR);

  it("scans the client directory", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const pattern of [".getDay(", "nextWorkoutIndex"]) {
    it(`contains no \`${pattern}\``, () => {
      const offenders = files.filter((f) =>
        readFileSync(f, "utf8").includes(pattern),
      );
      expect(offenders).toEqual([]);
    });
  }

  it("calls getNextProgramWorkout() in exactly one place (the data hook)", () => {
    const callers = files.filter((f) =>
      readFileSync(f, "utf8").includes("getNextProgramWorkout("),
    );
    expect(callers).toHaveLength(1);
    expect(callers[0].endsWith("useActiveClientProgram.ts")).toBe(true);
  });
});
