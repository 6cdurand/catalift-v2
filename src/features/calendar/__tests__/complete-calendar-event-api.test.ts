/* eslint-disable @typescript-eslint/no-explicit-any */

// P-09 — `completeCalendarEvent` must be ONE RPC call, awaited with retry.
// If it ever degrades into a client-side status update plus a separate
// client_sessions insert, a partial failure desynchronises money.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase", () => ({ getBrowserClient: vi.fn() }));

import { getBrowserClient } from "@/lib/supabase";
import { completeCalendarEvent } from "../api/events";

function buildMock(rpc: any) {
  const client = { rpc, from: vi.fn() };
  vi.mocked(getBrowserClient).mockReturnValue(client as any);
  return client;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("completeCalendarEvent", () => {
  it("calls the complete_calendar_event RPC with the event id and nothing else", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const client = buildMock(rpc);

    await completeCalendarEvent("event-abc");

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("complete_calendar_event", {
      p_event_id: "event-abc",
    });
    // No table writes: the ledger row is the RPC's job, in its transaction.
    expect(client.from).not.toHaveBeenCalled();
  });

  it("retries a failing call, then resolves", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ error: { message: "network" } })
      .mockResolvedValueOnce({ error: null });
    buildMock(rpc);

    await completeCalendarEvent("event-abc");

    expect(rpc).toHaveBeenCalledTimes(2);
  }, 10_000);

  it("throws once retries are exhausted, so the caller can roll back the row", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: { message: "offline" } });
    buildMock(rpc);

    await expect(completeCalendarEvent("event-abc")).rejects.toBeDefined();
    expect(rpc).toHaveBeenCalledTimes(3);
  }, 10_000);
});
