/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import type { ClientProgram } from "@/features/programs";

vi.mock("@/lib/supabase", () => ({ getBrowserClient: vi.fn() }));
vi.mock("../api/roster", () => ({ fetchClients: vi.fn() }));
vi.mock("@/features/programs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/programs")>();
  return { ...actual, fetchClientProgramsForTrainer: vi.fn() };
});
vi.mock("@/features/payments", () => ({ fetchTrainerSessions: vi.fn() }));

import {
  buildScheduledSessionsResult,
  getSessionsForDate,
} from "@/features/calendar";
import { fetchTrainerSessions } from "@/features/payments";
import {
  deriveCompletedDayIndices,
  fetchClientProgramsForTrainer,
  getNextProgramWorkout,
} from "@/features/programs";
import { getBrowserClient } from "@/lib/supabase";

import { fetchClients } from "../api/roster";
import {
  buildCompletedKey,
  buildTrainerWeekSchedule,
  useTrainerWeekSchedule,
} from "../hooks/useTrainerWeekSchedule";

// ─── Fixtures ──────────────────────────────────────────────────────────────

const RANGE_START = "2026-07-27"; // Monday
const RANGE_END = "2026-08-02"; // Sunday
const TUESDAY = "2026-07-28";
const WEDNESDAY = "2026-07-29";

function makeProgram(overrides: Partial<ClientProgram> = {}): ClientProgram {
  return {
    id: "prog-1",
    clientId: "client-1",
    trainerId: "trainer-1",
    name: "12-Week Strength",
    status: "active",
    phase: "strength",
    goal: "strength",
    weeklyPlan: [
      { id: "d1", label: "Push Day", scheduledDay: "tuesday", blocks: [] },
      { id: "d2", label: "Pull Day", scheduledDay: "thursday", blocks: [] },
    ],
    scheduleMode: "fixed",
    trainingDaysPerWeek: 2,
    selectedDays: ["tuesday", "thursday"],
    cycleAcrossWeeks: false,
    sessionPTMap: {},
    nextWorkoutIndex: 0,
    autoRepeat: false,
    startDate: "2026-07-01",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

const CLIENT_A = { id: "client-1", name: "Anna Jones", avatarUrl: null };
const CLIENT_B = { id: "client-2", name: "Ben Smith", avatarUrl: "b.png" };

function build(overrides: Partial<Parameters<typeof buildTrainerWeekSchedule>[0]> = {}) {
  return buildTrainerWeekSchedule({
    clients: [CLIENT_A],
    programsByClient: { "client-1": [makeProgram()] },
    completedDatesByClient: {},
    markedKeys: new Set<string>(),
    rangeStart: RANGE_START,
    rangeEnd: RANGE_END,
    selectedDate: TUESDAY,
    today: TUESDAY,
    ...overrides,
  });
}

// ─── Pure builder ──────────────────────────────────────────────────────────

describe("buildCompletedKey", () => {
  it("uses the load-bearing program:<programId>:<dayIndex>:<date> format", () => {
    expect(buildCompletedKey("prog-1", 0, TUESDAY)).toBe(
      "program:prog-1:0:2026-07-28",
    );
  });
});

describe("buildTrainerWeekSchedule", () => {
  it("fans out across multiple clients on the selected day", () => {
    const { daySessions } = build({
      clients: [CLIENT_B, CLIENT_A],
      programsByClient: {
        "client-1": [makeProgram()],
        "client-2": [makeProgram({ id: "prog-2", clientId: "client-2" })],
      },
    });

    expect(daySessions).toHaveLength(2);
    // Sorted by client name for a stable order.
    expect(daySessions.map((s) => s.clientName)).toEqual([
      "Anna Jones",
      "Ben Smith",
    ]);
    expect(daySessions[0].session.date).toBe(TUESDAY);
    expect(daySessions[0].session.label).toBe("Push Day");
    expect(daySessions[0].programName).toBe("12-Week Strength");
  });

  it("contributes nothing for a client with no programs", () => {
    const { daySessions, datesWithSessions } = build({
      clients: [CLIENT_A, CLIENT_B],
      programsByClient: { "client-1": [makeProgram()] },
    });

    expect(daySessions.map((s) => s.clientId)).toEqual(["client-1"]);
    expect(datesWithSessions.has(TUESDAY)).toBe(true);
  });

  it("contributes nothing for a client whose only program is not active", () => {
    const { daySessions, datesWithSessions } = build({
      programsByClient: {
        "client-1": [makeProgram({ status: "archived" })],
      },
    });

    expect(daySessions).toEqual([]);
    expect(datesWithSessions.size).toBe(0);
  });

  it("returns only the selected day's sessions", () => {
    const tuesday = build();
    const wednesday = build({ selectedDate: WEDNESDAY });

    expect(tuesday.daySessions).toHaveLength(1);
    expect(wednesday.daySessions).toHaveLength(0);
  });

  it("datesWithSessions matches the dates the selectors actually built", () => {
    const { datesWithSessions, sessionCountsByDate } = build();

    // The program trains Tuesday + Thursday; the visible week is Mon 27 → Sun 2.
    expect([...datesWithSessions].sort()).toEqual(["2026-07-28", "2026-07-30"]);
    expect(sessionCountsByDate).toEqual({
      "2026-07-28": 1,
      "2026-07-30": 1,
    });
  });

  it("counts one dot entry per client on a shared date", () => {
    const { sessionCountsByDate } = build({
      clients: [CLIENT_A, CLIENT_B],
      programsByClient: {
        "client-1": [makeProgram()],
        "client-2": [makeProgram({ id: "prog-2", clientId: "client-2" })],
      },
    });

    expect(sessionCountsByDate[TUESDAY]).toBe(2);
  });

  it("flags isMarkedComplete when a client_sessions row exists for the key", () => {
    const key = buildCompletedKey("prog-1", 0, TUESDAY);
    const { daySessions } = build({ markedKeys: new Set([key]) });

    expect(daySessions[0].completedKey).toBe(key);
    expect(daySessions[0].isMarkedComplete).toBe(true);
  });

  it("leaves isMarkedComplete false when no matching row exists", () => {
    const { daySessions } = build({
      markedKeys: new Set(["program:prog-1:0:2026-07-30"]),
    });

    expect(daySessions[0].isMarkedComplete).toBe(false);
  });

  it("derives status from the real today, not the selected day", () => {
    // Selection is Tuesday but today is Thursday → Tuesday is in the past.
    const { daySessions } = build({ today: "2026-07-30" });
    expect(daySessions[0].session.status).toBe("missed");
  });

  it("marks a day with a workouts row as done", () => {
    const { daySessions } = build({
      completedDatesByClient: { "client-1": [TUESDAY] },
    });
    expect(daySessions[0].session.status).toBe("done");
  });

  it("every program-day session carries a programId, so the dedupe key is never 'unknown'", () => {
    const { daySessions } = build();

    expect(daySessions).not.toHaveLength(0);
    for (const row of daySessions) {
      expect(row.session.programId).toBeTruthy();
      expect(row.completedKey).not.toContain(":unknown:");
      expect(row.completedKey).toBe(
        `program:${row.session.programId}:${row.session.dayIndex}:${row.session.date}`,
      );
    }
  });
});

// ─── Full-history parity with the athlete's own Today ──────────────────────
//
// COMMAND-CENTER REVIEW FIX: completedDates must be the client's FULL history.
// A week-scoped `workouts` read makes the trainer's "next day" diverge from the
// client's own Today, and resets a flexible program to day 0 on any week with
// no completions. These tests compare the trainer builder against the exact
// pipeline useScheduledSessions runs for the athlete (:172-198).

describe("buildTrainerWeekSchedule — parity with the athlete path", () => {
  const flexProgram = makeProgram({
    scheduleMode: "flexible",
    trainingDaysPerWeek: 3,
    selectedDays: [],
    weeklyPlan: [
      { id: "d1", label: "Push Day", blocks: [] },
      { id: "d2", label: "Pull Day", blocks: [] },
      { id: "d3", label: "Leg Day", blocks: [] },
    ],
  });

  /** Two completions LAST week — invisible to a range-filtered read. */
  const PRIOR_WEEK = ["2026-07-20", "2026-07-21"];

  /** Exactly what useScheduledSessions.ts:172-198 does for the athlete. */
  function athleteSessionsFor(
    program: ClientProgram,
    completedDates: string[],
    selected: string,
  ) {
    const next = getNextProgramWorkout(
      program,
      deriveCompletedDayIndices(program, completedDates),
      [],
    );
    const { sessions } = buildScheduledSessionsResult({
      program,
      next,
      completedDates,
      rangeStart: RANGE_START,
      rangeEnd: RANGE_END,
      today: selected,
      oneOffProgram: null,
      oneOffNext: null,
    });
    return getSessionsForDate(sessions, selected);
  }

  it("flexible: trainer next-day matches the athlete when completions are in a PRIOR week", () => {
    const athlete = athleteSessionsFor(flexProgram, PRIOR_WEEK, TUESDAY);
    const { daySessions } = build({
      programsByClient: { "client-1": [flexProgram] },
      completedDatesByClient: { "client-1": PRIOR_WEEK },
    });

    expect(athlete).toHaveLength(1);
    expect(daySessions).toHaveLength(1);
    expect(daySessions[0].session.dayIndex).toBe(athlete[0].dayIndex);
    expect(daySessions[0].session.label).toBe(athlete[0].label);
    // Two days done last week → the client is on the third day, not day 0.
    expect(daySessions[0].session.dayIndex).toBe(2);
    expect(daySessions[0].session.label).toBe("Leg Day");
  });

  it("REGRESSION: a week-scoped workouts read would reset the client to day 0", () => {
    const athlete = athleteSessionsFor(flexProgram, PRIOR_WEEK, TUESDAY);

    // Simulates the pre-fix behaviour: prior-week completions filtered out.
    const { daySessions } = build({
      programsByClient: { "client-1": [flexProgram] },
      completedDatesByClient: { "client-1": [] },
    });

    expect(daySessions[0].session.dayIndex).toBe(0);
    expect(daySessions[0].session.dayIndex).not.toBe(athlete[0].dayIndex);
  });

  it("fixed: trainer sessions match the athlete's for the same prior-week history", () => {
    const completed = ["2026-07-21"]; // a Tuesday last week → Push Day index 0
    const athlete = athleteSessionsFor(makeProgram(), completed, TUESDAY);
    const { daySessions } = build({
      completedDatesByClient: { "client-1": completed },
    });

    expect(daySessions).toHaveLength(athlete.length);
    expect(daySessions[0].session.dayIndex).toBe(athlete[0].dayIndex);
    expect(daySessions[0].session.label).toBe(athlete[0].label);
    expect(daySessions[0].session.status).toBe(athlete[0].status);
  });

  it("out-of-range history cannot invent sessions on the visible week", () => {
    const withHistory = build({
      completedDatesByClient: { "client-1": ["2026-01-05", "2026-03-17"] },
    });
    const withoutHistory = build();

    expect(withHistory.sessionCountsByDate).toEqual(
      withoutHistory.sessionCountsByDate,
    );
  });
});

// ─── The hook ──────────────────────────────────────────────────────────────

// The workouts read must be UNFILTERED by date. `gte`/`lte` are still exposed
// on the builder so a regression that re-adds a range is caught by assertion
// rather than by a confusing "not a function" crash.
function mockSupabaseWorkouts(rows: Array<{ user_id: string; performed_at: string }>) {
  const order = vi.fn().mockResolvedValue({ data: rows, error: null });
  const gte = vi.fn();
  const lte = vi.fn();
  const inFn = vi.fn().mockReturnValue({ order, gte, lte });
  const select = vi.fn().mockReturnValue({ in: inFn });
  const from = vi.fn().mockReturnValue({ select });
  vi.mocked(getBrowserClient).mockReturnValue({ from } as any);
  return { from, select, in: inFn, gte, lte, order };
}

describe("useTrainerWeekSchedule", () => {
  beforeEach(() => {
    vi.mocked(fetchClients).mockResolvedValue({
      clients: [
        {
          id: "client-1",
          name: "Anna Jones",
          email: "a@x.com",
          status: "active",
          avatarUrl: null,
          sessions: 0,
          lastSeen: null,
        },
        {
          id: "client-3",
          name: "Archived Alex",
          email: "c@x.com",
          status: "archived",
          avatarUrl: null,
          sessions: 0,
          lastSeen: null,
        },
      ],
      stats: { active: 1, pending: 0, total: 2 },
    });
    vi.mocked(fetchClientProgramsForTrainer).mockResolvedValue([makeProgram()]);
    vi.mocked(fetchTrainerSessions).mockResolvedValue([]);
    mockSupabaseWorkouts([]);
  });

  const args = {
    trainerId: "trainer-1",
    enabled: true,
    rangeStart: RANGE_START,
    rangeEnd: RANGE_END,
    selectedDate: TUESDAY,
  };

  it("does not fetch when disabled", async () => {
    const { result } = renderHook(() =>
      useTrainerWeekSchedule({ ...args, enabled: false }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(fetchClients).not.toHaveBeenCalled();
    expect(result.current.daySessions).toEqual([]);
  });

  it("loads the roster, programs and marked sessions, then builds the day", async () => {
    const { result } = renderHook(() => useTrainerWeekSchedule(args));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.clientCount).toBe(1); // archived client excluded
    expect(result.current.daySessions).toHaveLength(1);
    expect(result.current.daySessions[0].clientName).toBe("Anna Jones");
    expect(result.current.datesWithSessions.has(TUESDAY)).toBe(true);
    expect(fetchTrainerSessions).toHaveBeenCalledWith({
      rangeStart: RANGE_START,
      rangeEnd: RANGE_END,
    });
  });

  it("flags rows already present in client_sessions", async () => {
    vi.mocked(fetchTrainerSessions).mockResolvedValue([
      {
        id: "cs-1",
        trainerId: "trainer-1",
        clientId: "client-1",
        sessionDate: TUESDAY,
        source: "pt_completion",
        workoutId: null,
        calendarEventId: buildCompletedKey("prog-1", 0, TUESDAY),
        notes: null,
        createdAt: "2026-07-28T09:00:00.000Z",
      },
    ]);

    const { result } = renderHook(() => useTrainerWeekSchedule(args));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.daySessions[0].isMarkedComplete).toBe(true);
  });

  it("reads workouts for the whole roster with NO date filter (full history)", async () => {
    const mock = mockSupabaseWorkouts([]);

    const { result } = renderHook(() => useTrainerWeekSchedule(args));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mock.from).toHaveBeenCalledWith("workouts");
    expect(mock.in).toHaveBeenCalledWith("user_id", ["client-1"]);
    expect(mock.order).toHaveBeenCalledWith("performed_at", {
      ascending: true,
    });
    // The whole point of the fix: no performed_at window.
    expect(mock.gte).not.toHaveBeenCalled();
    expect(mock.lte).not.toHaveBeenCalled();
  });

  it("does not re-read workouts with a narrower range when the week changes", async () => {
    const mock = mockSupabaseWorkouts([]);

    const { result, rerender } = renderHook(
      (props: { rangeStart: string; rangeEnd: string }) =>
        useTrainerWeekSchedule({ ...args, ...props }),
      { initialProps: { rangeStart: RANGE_START, rangeEnd: RANGE_END } },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    rerender({ rangeStart: "2026-08-03", rangeEnd: "2026-08-09" });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mock.gte).not.toHaveBeenCalled();
    expect(mock.lte).not.toHaveBeenCalled();
  });

  it("keeps the schedule when the workouts read fails (best-effort)", async () => {
    const order = vi
      .fn()
      .mockResolvedValue({ data: null, error: new Error("workouts down") });
    const inFn = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ in: inFn });
    vi.mocked(getBrowserClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ select }),
    } as any);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useTrainerWeekSchedule(args));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.daySessions).toHaveLength(1);
    errorSpy.mockRestore();
  });

  it("surfaces a roster failure as an error", async () => {
    vi.mocked(fetchClients).mockRejectedValue(new Error("roster down"));

    const { result } = renderHook(() => useTrainerWeekSchedule(args));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error?.message).toBe("roster down");
    expect(result.current.daySessions).toEqual([]);
  });

  it("re-fetches when refresh() is called", async () => {
    const { result } = renderHook(() => useTrainerWeekSchedule(args));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchClients).toHaveBeenCalledTimes(1);

    result.current.refresh();

    await waitFor(() => expect(fetchClients).toHaveBeenCalledTimes(2));
    // refresh() must not flash the skeletons.
    expect(result.current.isLoading).toBe(false);
  });

  it("changing the selected day re-slices without re-fetching", async () => {
    const { result, rerender } = renderHook(
      (props: { selectedDate: string }) =>
        useTrainerWeekSchedule({ ...args, selectedDate: props.selectedDate }),
      { initialProps: { selectedDate: TUESDAY } },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.daySessions).toHaveLength(1);

    rerender({ selectedDate: WEDNESDAY });

    expect(result.current.daySessions).toHaveLength(0);
    expect(fetchClients).toHaveBeenCalledTimes(1);
  });
});
