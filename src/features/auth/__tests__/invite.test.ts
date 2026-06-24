import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const rpc = vi.fn();

vi.mock("@/lib/supabase", () => ({
  getBrowserClient: () => ({ rpc }),
}));

// Invites are ON as of migration 00006.
vi.mock("@/config/feature-flags", () => ({
  isFeatureEnabled: (flag: string) => flag === "invites",
}));

import { verifyInviteToken, acceptInvite } from "../api/invite";

describe("verifyInviteToken", () => {
  it("returns `valid` with email + trainer name for a pending, unexpired token", async () => {
    rpc.mockResolvedValueOnce({
      data: [{ email: "client@example.com", trainer_name: "Coach Sam", valid: true }],
      error: null,
    });

    const result = await verifyInviteToken("good-token");

    expect(rpc).toHaveBeenCalledWith("verify_invitation", { p_token: "good-token" });
    expect(result).toEqual({
      status: "valid",
      email: "client@example.com",
      trainerName: "Coach Sam",
    });
  });

  // The security-definer RPC collapses expired / accepted / revoked into
  // valid=false, and unknown tokens into no rows. All must surface as `invalid`
  // so we never leak which state the token was in (anti-enumeration, G-25).
  it.each([
    ["expired/accepted/revoked", { data: [{ email: "x", trainer_name: "y", valid: false }], error: null }],
    ["unknown token (no rows)", { data: [], error: null }],
    ["null data", { data: null, error: null }],
  ])("returns `invalid` for %s", async (_label, response) => {
    rpc.mockResolvedValueOnce(response);
    expect(await verifyInviteToken("t")).toEqual({ status: "invalid" });
  });

  it("throws when the RPC errors (no localStorage fallback)", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: new Error("boom") });
    await expect(verifyInviteToken("t")).rejects.toThrow("boom");
  });
});

describe("acceptInvite", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("calls accept_invitation once on success", async () => {
    rpc.mockResolvedValueOnce({ data: "trainer-1", error: null });

    await acceptInvite("good-token", "user-1");

    expect(rpc).toHaveBeenCalledWith("accept_invitation", { p_token: "good-token" });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("retries on transient failure then succeeds", async () => {
    rpc
      .mockResolvedValueOnce({ data: null, error: new Error("network") })
      .mockResolvedValueOnce({ data: "trainer-1", error: null });

    const promise = acceptInvite("good-token", "user-1");
    await vi.runAllTimersAsync();
    await promise;

    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting retries (e.g. re-used / invalid token)", async () => {
    rpc
      .mockResolvedValueOnce({ data: null, error: new Error("invitation is not valid") })
      .mockResolvedValueOnce({ data: null, error: new Error("invitation is not valid") })
      .mockResolvedValueOnce({ data: null, error: new Error("invitation is not valid") });

    const promise = acceptInvite("used-token", "user-1");
    const assertion = expect(promise).rejects.toThrow("invitation is not valid");
    await vi.runAllTimersAsync();
    await assertion;

    expect(rpc).toHaveBeenCalledTimes(3);
  });
});
