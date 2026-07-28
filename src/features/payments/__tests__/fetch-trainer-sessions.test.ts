/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase", () => ({ getBrowserClient: vi.fn() }));

import { getBrowserClient } from "@/lib/supabase";
import { fetchTrainerSessions, markSessionComplete } from "../api/sessions";

const ROW = {
  id: "cs-1",
  trainer_id: "trainer-1",
  client_id: "client-1",
  session_date: "2026-07-28",
  source: "pt_completion",
  workout_id: null,
  calendar_event_id: "program:prog-1:0:2026-07-28",
  notes: null,
  created_at: "2026-07-28T09:00:00.000Z",
};

function buildMock({
  user = { id: "trainer-1" } as { id: string } | null,
  rows = [ROW] as any[] | null,
  error = null as any,
}) {
  const order = vi.fn().mockResolvedValue({ data: rows, error });
  const lte = vi.fn().mockReturnValue({ order });
  const gte = vi.fn().mockReturnValue({ lte });
  // `.eq()` must support both "then .order()" (no range) and "then .gte()".
  const eq = vi.fn().mockReturnValue({ order, gte });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });

  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from,
  };
  vi.mocked(getBrowserClient).mockReturnValue(client as any);
  return { client, from, select, eq, gte, lte, order };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchTrainerSessions", () => {
  it("scopes the query to the authenticated trainer", async () => {
    const mock = buildMock({});

    const result = await fetchTrainerSessions();

    expect(mock.from).toHaveBeenCalledWith("client_sessions");
    expect(mock.eq).toHaveBeenCalledWith("trainer_id", "trainer-1");
    expect(result).toHaveLength(1);
    expect(result[0].calendarEventId).toBe("program:prog-1:0:2026-07-28");
  });

  it("applies the session_date range when one is supplied", async () => {
    const mock = buildMock({});

    await fetchTrainerSessions({
      rangeStart: "2026-07-27",
      rangeEnd: "2026-08-02",
    });

    expect(mock.gte).toHaveBeenCalledWith("session_date", "2026-07-27");
    expect(mock.lte).toHaveBeenCalledWith("session_date", "2026-08-02");
  });

  it("omits the range filter when called with no arguments (all-time)", async () => {
    const mock = buildMock({});

    await fetchTrainerSessions();

    expect(mock.gte).not.toHaveBeenCalled();
    expect(mock.lte).not.toHaveBeenCalled();
  });

  it("returns an empty list when there are no rows", async () => {
    buildMock({ rows: null });
    await expect(fetchTrainerSessions()).resolves.toEqual([]);
  });

  it("throws when not authenticated", async () => {
    buildMock({ user: null });
    await expect(fetchTrainerSessions()).rejects.toThrow("Not authenticated");
  });

  it("throws when the query fails", async () => {
    buildMock({ rows: null, error: new Error("Database error") });
    await expect(fetchTrainerSessions()).rejects.toThrow("Database error");
  });
});

describe("markSessionComplete — program-derived idempotency", () => {
  it("returns the existing row instead of inserting twice on 23505", async () => {
    const existing = { ...ROW };
    const single = vi.fn().mockResolvedValue({ data: existing, error: null });
    const eqEvent = vi.fn().mockReturnValue({ single });
    const eqClient = vi.fn().mockReturnValue({ eq: eqEvent });
    const selectExisting = vi.fn().mockReturnValue({ eq: eqClient });

    const insertSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: { code: "23505" } });
    const insertSelect = vi.fn().mockReturnValue({ single: insertSingle });
    const insert = vi.fn().mockReturnValue({ select: insertSelect });

    vi.mocked(getBrowserClient).mockReturnValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "trainer-1" } } }),
      },
      from: vi.fn().mockReturnValue({ insert, select: selectExisting }),
    } as any);

    const result = await markSessionComplete({
      clientId: "client-1",
      source: "pt_completion",
      sessionDate: "2026-07-28",
      calendarEventId: "program:prog-1:0:2026-07-28",
    });

    // One insert attempt, no retry loop, and the pre-existing ledger row back.
    expect(insert).toHaveBeenCalledTimes(1);
    expect(eqEvent).toHaveBeenCalledWith(
      "calendar_event_id",
      "program:prog-1:0:2026-07-28",
    );
    expect(result.id).toBe("cs-1");
  });
});
