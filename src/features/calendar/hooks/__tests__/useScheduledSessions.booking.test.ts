/* eslint-disable @typescript-eslint/no-explicit-any */

// P-08 — hook-level proof that useScheduledSessions (the athlete/client
// surface) calls the ONE shared `listVisibleCalendarEvents` +
// `mergeCalendarEventsIntoSessions` pipeline, with `mode: "user"` (never
// "trainer" — that would leak a trainer's clients' assigned workouts onto
// their own calendar, see lib/calendarScope.ts).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import type { ClientProgram, ProgramDay, Weekday } from "@/features/programs";
import { useProgramsStore } from "@/features/programs";
import type { CalendarEvent } from "@/types";

const mockUseSession = vi.fn();
const mockUseUserRole = vi.fn();
vi.mock("@/features/auth", () => ({
  useSession: () => mockUseSession(),
  useUserRole: () => mockUseUserRole(),
}));

vi.mock("@/lib/supabase", () => ({ getBrowserClient: vi.fn() }));

const mockListVisibleCalendarEvents = vi.fn();
vi.mock("../../api/events", () => ({
  listVisibleCalendarEvents: (...args: unknown[]) =>
    mockListVisibleCalendarEvents(...args),
}));

import { getBrowserClient } from "@/lib/supabase";
import { useScheduledSessions } from "../useScheduledSessions";

const TODAY_ISO = new Date().toISOString().slice(0, 10);
const RANGE_START = "2024-01-01";
const RANGE_END = "2024-12-31";

function day(id: string, label: string, scheduledDay?: Weekday): ProgramDay {
  return { id, label, scheduledDay, blocks: [] };
}

function makeProgram(overrides: Partial<ClientProgram> = {}): ClientProgram {
  return {
    id: "prog-1",
    clientId: "user-1",
    trainerId: "trainer-1",
    name: "Test Program",
    status: "active",
    phase: "hypertrophy",
    goal: "hypertrophy",
    weeklyPlan: [day("d0", "Push Day", "monday")],
    scheduleMode: "fixed",
    trainingDaysPerWeek: 1,
    selectedDays: [],
    cycleAcrossWeeks: false,
    sessionPTMap: {},
    nextWorkoutIndex: 0,
    autoRepeat: false,
    startDate: "2024-01-01",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function mockSupabaseWorkouts(rows: Array<{ performed_at: string }> = []) {
  const order = vi.fn().mockResolvedValue({ data: rows, error: null });
  const eq = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  vi.mocked(getBrowserClient).mockReturnValue({ from } as any);
}

describe("useScheduledSessions — P-08 calendar_events integration", () => {
  beforeEach(() => {
    useProgramsStore.setState({ clientPrograms: [], savedPrograms: [] });
    mockUseSession.mockReturnValue({ user: { id: "user-1" }, loading: false });
    mockUseUserRole.mockReturnValue({ role: "client", loading: false });
    mockListVisibleCalendarEvents.mockResolvedValue([]);
    mockSupabaseWorkouts([]);
  });

  it("reads calendar_events with mode: 'user' for a client, never 'trainer'", async () => {
    const { result } = renderHook(() =>
      useScheduledSessions({ rangeStart: RANGE_START, rangeEnd: RANGE_END }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockListVisibleCalendarEvents).toHaveBeenCalledWith({
      userId: "user-1",
      mode: "user",
      rangeStart: RANGE_START,
      rangeEnd: RANGE_END,
    });
  });

  it("reads calendar_events with mode: 'trainer' when the viewer is a trainer", async () => {
    mockUseUserRole.mockReturnValue({ role: "trainer", loading: false });

    const { result } = renderHook(() =>
      useScheduledSessions({ rangeStart: RANGE_START, rangeEnd: RANGE_END }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockListVisibleCalendarEvents).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "trainer" }),
    );
  });

  it("a booked session appears even when the client has no active program", async () => {
    const event: CalendarEvent = {
      id: "evt-1",
      title: "PT Session",
      type: "session",
      date: TODAY_ISO,
      startTime: "09:00",
      clientId: "user-1",
      trainerId: "trainer-1",
      status: "scheduled",
    };
    mockListVisibleCalendarEvents.mockResolvedValue([event]);

    const { result } = renderHook(() =>
      useScheduledSessions({ rangeStart: RANGE_START, rangeEnd: RANGE_END }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].kind).toBe("booking");
    expect(result.current.sessions[0].startTime).toBe("09:00");
    expect(result.current.sessions[0].eventId).toBe("evt-1");
  });

  it("THE TRAP: a booking colliding with a program-derived day yields exactly one session — the booked one", async () => {
    useProgramsStore.setState({
      clientPrograms: [makeProgram()],
      savedPrograms: [],
    });
    // Monday matching the program's scheduled day.
    const mondayInRange = "2024-01-08";
    const event: CalendarEvent = {
      id: "evt-2",
      title: "Push Day (booked)",
      type: "workout",
      date: mondayInRange,
      startTime: "07:00",
      clientId: "user-1",
      trainerId: "trainer-1",
      programId: "prog-1",
      programDayIndex: 0,
      status: "scheduled",
    };
    mockListVisibleCalendarEvents.mockResolvedValue([event]);

    const { result } = renderHook(() =>
      useScheduledSessions({ rangeStart: RANGE_START, rangeEnd: RANGE_END }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const onMonday = result.current.sessions.filter(
      (s) => s.date === mondayInRange,
    );
    expect(onMonday).toHaveLength(1);
    expect(onMonday[0].kind).toBe("booking");
    expect(onMonday[0].eventId).toBe("evt-2");
  });

  it("keeps the program-derived schedule when the calendar_events read fails (best-effort)", async () => {
    useProgramsStore.setState({
      clientPrograms: [makeProgram()],
      savedPrograms: [],
    });
    mockListVisibleCalendarEvents.mockRejectedValue(new Error("down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() =>
      useScheduledSessions({ rangeStart: RANGE_START, rangeEnd: RANGE_END }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.sessions.some((s) => s.kind === "program-day")).toBe(
      true,
    );
    errorSpy.mockRestore();
  });
});
