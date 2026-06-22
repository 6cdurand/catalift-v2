import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  createOfflineQueue,
  registerOnlineDrain,
  type QueueExecutor,
} from "../lib/offline-queue";
import type { QueuedWrite } from "../types";

beforeEach(() => {
  localStorage.clear();
});

describe("offline queue", () => {
  it("enqueues in FIFO order and reports pending count", () => {
    const store = createOfflineQueue("user-1");

    store.getState().enqueue("a", { x: 1 });
    store.getState().enqueue("b", { x: 2 });

    expect(store.getState().pending()).toBe(2);
    expect(store.getState().items.map((w) => w.op)).toEqual(["a", "b"]);
  });

  it("persists under a user-scoped key", () => {
    const store = createOfflineQueue("user-42");

    store.getState().enqueue("a", 1);

    expect(
      localStorage.getItem("catalift-data-sync:offline-queue-user-42"),
    ).not.toBeNull();
  });

  it("drains successful writes and removes them", async () => {
    const store = createOfflineQueue("u");
    store.getState().enqueue("a", 1);
    store.getState().enqueue("b", 2);
    const executor = vi.fn(async () => {});

    const result = await store.getState().drain(executor);

    expect(executor).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ drained: 2, failed: 0, remaining: 0 });
    expect(store.getState().pending()).toBe(0);
  });

  it("keeps failed writes queued and increments attempts, draining on retry", async () => {
    const store = createOfflineQueue("u");
    store.getState().enqueue("a", 1);
    store.getState().enqueue("b", 2);

    const failing = vi.fn(async (write: QueuedWrite) => {
      if (write.op === "a") throw new Error("network");
    });
    const first = await store.getState().drain(failing);

    expect(first).toEqual({ drained: 1, failed: 1, remaining: 1 });
    expect(store.getState().items).toHaveLength(1);
    expect(store.getState().items[0]).toMatchObject({ op: "a", attempts: 1 });

    const succeeding = vi.fn(async () => {});
    const second = await store.getState().drain(succeeding);

    expect(second).toEqual({ drained: 1, failed: 0, remaining: 0 });
    expect(store.getState().pending()).toBe(0);
  });

  it("drains when the browser fires the 'online' event", async () => {
    const store = createOfflineQueue("u");
    store.getState().enqueue("a", 1);
    const executor: QueueExecutor = vi.fn(async () => {});

    const cleanup = registerOnlineDrain(store, executor);
    window.dispatchEvent(new Event("online"));

    await vi.waitFor(() => expect(store.getState().pending()).toBe(0));
    expect(executor).toHaveBeenCalledTimes(1);

    cleanup();
  });
});
