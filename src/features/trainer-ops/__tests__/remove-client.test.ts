/* eslint-disable @typescript-eslint/no-explicit-any */

// P-06-L1 — `removeClient` (inventory row 55). The only destructive action on the
// client file. Three things must hold:
//   1. the delete is scoped by BOTH trainer_id and client_id (never client_id
//      alone — RLS would still allow it, but a bug there deletes the wrong link),
//   2. it is awaited with retry (G-11), and
//   3. a delete that matches nothing surfaces as an error instead of a silent
//      "removed" toast — RLS refusals return no error, only zero rows.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase", () => ({ getBrowserClient: vi.fn() }));

import { getBrowserClient } from "@/lib/supabase";
import { removeClient } from "../api/clients";

const TRAINER_ID = "trainer-1";
const CLIENT_ID = "client-9";

function buildMock(results: { data: unknown; error: unknown }[]) {
  const select = vi.fn(() => Promise.resolve(results.shift() ?? { data: [], error: null }));
  const eqClient = vi.fn(() => ({ select }));
  const eqTrainer = vi.fn(() => ({ eq: eqClient }));
  const del = vi.fn(() => ({ eq: eqTrainer }));
  const from = vi.fn(() => ({ delete: del }));

  vi.mocked(getBrowserClient).mockReturnValue({
    from,
    auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: { id: TRAINER_ID } } })) },
  } as any);

  return { from, del, eqTrainer, eqClient, select };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("removeClient", () => {
  it("deletes the trainer_clients link scoped by BOTH trainer_id and client_id", async () => {
    const mock = buildMock([{ data: [{ id: "tc-1" }], error: null }]);

    await removeClient(CLIENT_ID);

    expect(mock.from).toHaveBeenCalledWith("trainer_clients");
    expect(mock.del).toHaveBeenCalledTimes(1);
    expect(mock.eqTrainer).toHaveBeenCalledWith("trainer_id", TRAINER_ID);
    expect(mock.eqClient).toHaveBeenCalledWith("client_id", CLIENT_ID);
    // Nothing else is touched: the account, workouts and money history survive.
    expect(mock.from).toHaveBeenCalledTimes(1);
  });

  it("retries a transient failure, then resolves", async () => {
    const mock = buildMock([
      { data: null, error: { message: "network" } },
      { data: [{ id: "tc-1" }], error: null },
    ]);

    await removeClient(CLIENT_ID);

    expect(mock.select).toHaveBeenCalledTimes(2);
  }, 10_000);

  it("throws after exhausting retries so the caller can surface the failure", async () => {
    const mock = buildMock([
      { data: null, error: { message: "offline" } },
      { data: null, error: { message: "offline" } },
      { data: null, error: { message: "offline" } },
    ]);

    await expect(removeClient(CLIENT_ID)).rejects.toBeDefined();
    expect(mock.select).toHaveBeenCalledTimes(3);
  }, 10_000);

  it("treats a zero-row delete as a failure, not a silent success", async () => {
    // What an RLS refusal looks like over PostgREST: no error, no rows.
    buildMock([
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
    ]);

    await expect(removeClient(CLIENT_ID)).rejects.toThrow(/nothing was removed/i);
  }, 10_000);
});
