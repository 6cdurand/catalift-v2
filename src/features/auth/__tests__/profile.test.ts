import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const from = vi.fn();

vi.mock("@/lib/supabase", () => ({
  getBrowserClient: () => ({ from }),
}));

import { upsertProfile, UsernameTakenError } from "../api/profile";

function mockUpdate(...results: Array<{ error: unknown }>) {
  const eq = vi.fn();
  for (const result of results) eq.mockResolvedValueOnce(result);
  const update = vi.fn().mockReturnValue({ eq });
  from.mockReturnValue({ update });
  return { update, eq };
}

describe("upsertProfile", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("maps camelCase fields to the snake_case columns from migration 00006", async () => {
    const { update } = mockUpdate({ error: null });

    await upsertProfile("user-1", {
      fullName: "Jo",
      username: "jo123",
      gender: "female",
      heightCm: 170,
      weightKg: 65,
    });

    expect(from).toHaveBeenCalledWith("users");
    expect(update).toHaveBeenCalledWith({
      full_name: "Jo",
      username: "jo123",
      gender: "female",
      height_cm: 170,
      weight_kg: 65,
    });
  });

  it("nulls out non-positive / NaN height & weight", async () => {
    const { update } = mockUpdate({ error: null });

    await upsertProfile("user-1", { heightCm: 0, weightKg: Number.NaN });

    expect(update).toHaveBeenCalledWith({ height_cm: null, weight_kg: null });
  });

  it("throws UsernameTakenError immediately on a unique violation (no retry)", async () => {
    const { eq } = mockUpdate({ error: { code: "23505", message: "duplicate key" } });

    await expect(
      upsertProfile("user-1", { username: "taken" }),
    ).rejects.toBeInstanceOf(UsernameTakenError);

    // No retry/backoff: a duplicate username never resolves on retry.
    expect(eq).toHaveBeenCalledTimes(1);
  });

  it("does NOT treat a unique violation as UsernameTakenError when username is absent", async () => {
    const { eq } = mockUpdate(
      { error: { code: "23505", message: "some other unique" } },
      { error: { code: "23505", message: "some other unique" } },
      { error: { code: "23505", message: "some other unique" } },
    );

    const promise = upsertProfile("user-1", { fullName: "Jo" });
    const assertion = expect(promise).rejects.not.toBeInstanceOf(UsernameTakenError);
    await vi.runAllTimersAsync();
    await assertion;

    expect(eq).toHaveBeenCalledTimes(3);
  });
});
