import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const from = vi.fn();

vi.mock("@/lib/supabase", () => ({
  getBrowserClient: () => ({ from }),
}));

import { readUserMode, syncUserModeToProfile } from "../api/user-mode";

function mockUpdate(...results: Array<{ error: unknown }>) {
  const eq = vi.fn();
  for (const result of results) {
    eq.mockResolvedValueOnce(result);
  }
  const update = vi.fn().mockReturnValue({ eq });
  from.mockReturnValue({ update });
  return { update, eq };
}

describe("readUserMode", () => {
  it("returns 'trainer' only when metadata.mode is trainer", () => {
    expect(readUserMode({ mode: "trainer" })).toBe("trainer");
  });

  it("defaults to 'client' for client, missing, null, or unknown values", () => {
    expect(readUserMode({ mode: "client" })).toBe("client");
    expect(readUserMode({})).toBe("client");
    expect(readUserMode(null)).toBe("client");
    expect(readUserMode(undefined)).toBe("client");
    expect(readUserMode({ mode: "admin" })).toBe("client");
  });
});

describe("syncUserModeToProfile", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates users.role once on success", async () => {
    const { update, eq } = mockUpdate({ error: null });

    await syncUserModeToProfile("user-1", "trainer");

    expect(from).toHaveBeenCalledWith("users");
    expect(update).toHaveBeenCalledWith({ role: "trainer" });
    expect(eq).toHaveBeenCalledWith("id", "user-1");
    expect(eq).toHaveBeenCalledTimes(1);
  });

  it("retries on transient failure then succeeds", async () => {
    const { eq } = mockUpdate(
      { error: new Error("network") },
      { error: null },
    );

    const promise = syncUserModeToProfile("user-1", "client");
    await vi.runAllTimersAsync();
    await promise;

    expect(eq).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting retries", async () => {
    const { eq } = mockUpdate(
      { error: new Error("down") },
      { error: new Error("down") },
      { error: new Error("down") },
    );

    const promise = syncUserModeToProfile("user-1", "client");
    const assertion = expect(promise).rejects.toThrow("down");
    await vi.runAllTimersAsync();
    await assertion;

    expect(eq).toHaveBeenCalledTimes(3);
  });
});
