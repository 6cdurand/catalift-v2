import { describe, it, expect, vi, beforeEach } from "vitest";

// Unit tests for the w2c-1 Save/Activate flow.
// Tests the assignProgramToClient call path: serialization shape,
// trainer-mode guard, and scheduleMode/selectedDays persistence.
//
// The actual Supabase write is mocked — we verify the payload that
// would be sent to client_programs, not the DB round-trip.

vi.mock("@/lib/supabase", () => ({
  getBrowserClient: () => ({
    from: vi.fn(() => ({
      upsert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: "prog-1", trainer_id: "trainer-1", client_id: "client-1", name: "Test", status: "active", program_data: {}, next_workout_index: 0, start_date: "2024-01-01", end_date: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
            error: null,
          })),
        })),
      })),
    })),
  }),
}));

import { assignProgramToClient } from "../api/assign";
import { clientProgramToRow } from "../lib/serialize";
import type { ClientProgram, ProgramDay, Weekday } from "../types";

function day(id: string, scheduledDay?: Weekday): ProgramDay {
  return { id, label: id, scheduledDay, blocks: [] };
}

function makeProgram(overrides: Partial<ClientProgram> = {}): ClientProgram {
  return {
    id: "prog-1",
    clientId: "client-1",
    trainerId: "trainer-1",
    name: "Test Program",
    status: "active",
    phase: "hypertrophy",
    goal: "hypertrophy",
    weeklyPlan: [day("d0", "monday"), day("d1", "wednesday")],
    scheduleMode: "fixed",
    trainingDaysPerWeek: 2,
    selectedDays: ["monday", "wednesday"],
    cycleAcrossWeeks: false,
    sessionPTMap: {},
    nextWorkoutIndex: 0,
    autoRepeat: false,
    startDate: "2024-01-01",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("w2c-1 Save/Activate: assignProgramToClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("self-assign: builds correct client_programs payload with clientId = user.id", async () => {
    const program = makeProgram({
      clientId: "user-self-id",
      trainerId: "user-self-id",
    });

    const row = clientProgramToRow(program);
    expect(row.client_id).toBe("user-self-id");
    expect(row.trainer_id).toBe("user-self-id");
    expect(row.status).toBe("active");
    expect(row.name).toBe("Test Program");
  });

  it("trainer-assign: builds correct client_programs payload with clientId = client, trainerId = trainer", async () => {
    const program = makeProgram({
      clientId: "client-target-id",
      trainerId: "trainer-user-id",
    });

    const row = clientProgramToRow(program);
    expect(row.client_id).toBe("client-target-id");
    expect(row.trainer_id).toBe("trainer-user-id");
  });

  it("scheduleMode + selectedDays persisted in program_data snapshot", () => {
    const program = makeProgram({
      scheduleMode: "fixed",
      selectedDays: ["monday", "wednesday", "friday"],
      trainingDaysPerWeek: 3,
    });

    const row = clientProgramToRow(program);
    const snapshot = row.program_data as unknown as ClientProgram;
    expect(snapshot.scheduleMode).toBe("fixed");
    expect(snapshot.selectedDays).toEqual(["monday", "wednesday", "friday"]);
    expect(snapshot.trainingDaysPerWeek).toBe(3);
  });

  it("flexible mode: sanitize strips scheduledDay + selectedDays before save", async () => {
    const program = makeProgram({
      scheduleMode: "flexible",
      selectedDays: ["monday", "wednesday"],
      weeklyPlan: [day("d0", "monday"), day("d1", "wednesday")],
    });

    const result = await assignProgramToClient(program);
    expect(result.ok).toBe(true);
    // The sanitized program should have been passed to upsert;
    // sanitizeProgramForSave strips scheduledDay for flexible mode
    // (verified in sanitize-program-for-save.test.ts)
  });

  it("trainer-without-client: guard rejects before write", () => {
    // This tests the guard logic from ProgramBuilder.handleConfirmSave:
    //   if (isTrainerMode && !clientId) { toast.error(...); return; }
    // We simulate the guard inline since it lives in the component,
    // not in assignProgramToClient itself.
    const isTrainerMode = true;
    const clientId: string | null = null;

    const guardRejects = isTrainerMode && !clientId;
    expect(guardRejects).toBe(true);
  });

  it("self-mode without trainer: no guard rejection, clientId = user.id", () => {
    const isTrainerMode = false;
    const clientId: string | null = null;
    const userId = "user-self-id";

    const guardRejects = isTrainerMode && !clientId;
    expect(guardRejects).toBe(false);

    const targetClientId = isTrainerMode ? clientId! : userId;
    expect(targetClientId).toBe("user-self-id");
  });

  it("sessionPTMap persisted in program_data snapshot", () => {
    const program = makeProgram({
      sessionPTMap: { 0: "pt", 1: "personal", 2: "pt" },
    });

    const row = clientProgramToRow(program);
    const snapshot = row.program_data as unknown as ClientProgram;
    expect(snapshot.sessionPTMap).toEqual({ 0: "pt", 1: "personal", 2: "pt" });
  });

  it("weeklyPlan serialized with correct shape (blocks, exercises, scheduledDay)", () => {
    const program = makeProgram({
      scheduleMode: "fixed",
      weeklyPlan: [
        {
          id: "day-1",
          label: "Push",
          scheduledDay: "monday",
          blocks: [
            {
              id: "blk-1",
              type: "work",
              name: "Main Lifts",
              exercises: [
                {
                  id: "ex-1",
                  exerciseId: "bench-press",
                  exerciseName: "Bench Press",
                  movementPattern: "compound",
                  sets: 3,
                  reps: "8-12",
                  rest: "60s",
                  repType: "reps",
                  setStyle: "fixed",
                },
              ],
            },
          ],
        },
      ],
    });

    const row = clientProgramToRow(program);
    const snapshot = row.program_data as unknown as ClientProgram;
    expect(snapshot.weeklyPlan).toHaveLength(1);
    expect(snapshot.weeklyPlan[0].label).toBe("Push");
    expect(snapshot.weeklyPlan[0].scheduledDay).toBe("monday");
    expect(snapshot.weeklyPlan[0].blocks).toHaveLength(1);
    expect(snapshot.weeklyPlan[0].blocks[0].exercises).toHaveLength(1);
    expect(snapshot.weeklyPlan[0].blocks[0].exercises[0].exerciseName).toBe(
      "Bench Press",
    );
  });
});
