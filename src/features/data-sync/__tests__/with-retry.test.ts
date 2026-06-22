import { describe, it, expect, vi } from "vitest";

import { withRetry } from "../lib/with-retry";
import { SyncError } from "../lib/sync-error";

describe("withRetry", () => {
  it("returns the result on first success without retrying", async () => {
    const fn = vi.fn(async () => "ok");

    const result = await withRetry(fn, { baseMs: 1, operation: "test" });

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries then succeeds before exhausting attempts", async () => {
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValue("ok");
    const onRetry = vi.fn();

    const result = await withRetry(fn, {
      baseMs: 1,
      retries: 3,
      operation: "test",
      onRetry,
    });

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("throws a typed SyncError after exhausting retries", async () => {
    const cause = new Error("boom");
    const fn = vi.fn(async () => {
      throw cause;
    });

    const error = await withRetry(fn, {
      baseMs: 1,
      retries: 3,
      operation: "workout:create",
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(SyncError);
    expect((error as SyncError).operation).toBe("workout:create");
    expect((error as SyncError).attempts).toBe(3);
    expect((error as SyncError).cause).toBe(cause);
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
