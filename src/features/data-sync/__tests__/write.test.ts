import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/sentry", () => ({ captureException: vi.fn() }));

import { captureException } from "@/lib/sentry";
import { persist } from "../lib/write";
import { SyncError } from "../lib/sync-error";
import { createOfflineQueue } from "../lib/offline-queue";

beforeEach(() => {
  localStorage.clear();
});

describe("persist (write boundary)", () => {
  it("returns ok with data on success and does not report", async () => {
    const result = await persist({ name: "x:create" }, async () => 42);

    expect(result).toEqual({ ok: true, data: 42 });
    expect(vi.mocked(captureException)).not.toHaveBeenCalled();
  });

  it("reports to Sentry once and enqueues for replay on terminal failure", async () => {
    const store = createOfflineQueue("u");

    const result = await persist(
      { name: "x:create", payload: { a: 1 } },
      async () => {
        throw new Error("db down");
      },
      { queue: store, retry: { baseMs: 1, retries: 2 } },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(SyncError);
      expect(result.error.operation).toBe("x:create");
      expect(result.error.attempts).toBe(2);
    }
    expect(vi.mocked(captureException)).toHaveBeenCalledTimes(1);
    expect(store.getState().pending()).toBe(1);
    expect(store.getState().items[0]).toMatchObject({
      op: "x:create",
      payload: { a: 1 },
      attempts: 0,
    });
  });
});
