import { describe, it, expect, beforeEach } from "vitest";

import {
  SELECTED_DATE_RESOURCE,
  isISODate,
  readSelectedDate,
  subscribeToSelectedDate,
  writeSelectedDate,
} from "../selected-date-storage";
import { userScopedKey } from "@/utils/user-scoped-key";

const KEY = userScopedKey(SELECTED_DATE_RESOURCE, "user-1");

beforeEach(() => {
  sessionStorage.clear();
});

describe("isISODate", () => {
  it("accepts a real ISO calendar date", () => {
    expect(isISODate("2026-07-29")).toBe(true);
    expect(isISODate("2028-02-29")).toBe(true); // leap day
  });

  it("rejects malformed strings", () => {
    expect(isISODate("")).toBe(false);
    expect(isISODate("not-a-date")).toBe(false);
    expect(isISODate("2026-7-9")).toBe(false);
    expect(isISODate("2026-07-29T00:00:00.000Z")).toBe(false);
  });

  it("rejects a well-formed but impossible date", () => {
    expect(isISODate("2026-02-31")).toBe(false);
    expect(isISODate("2026-13-01")).toBe(false);
  });
});

describe("readSelectedDate / writeSelectedDate", () => {
  it("round-trips an ISO date", () => {
    writeSelectedDate(KEY, "2026-07-30");
    expect(readSelectedDate(KEY)).toBe("2026-07-30");
  });

  it("scopes the key to the user (AGENTS.md #4 — no cross-account leak)", () => {
    writeSelectedDate(KEY, "2026-07-30");
    expect(readSelectedDate(userScopedKey(SELECTED_DATE_RESOURCE, "user-2"))).toBeNull();
    expect(KEY).toBe("catalift-today-selected-date-user-1");
  });

  it("returns null when nothing is stored", () => {
    expect(readSelectedDate(KEY)).toBeNull();
  });

  it("returns null for a corrupt stored value instead of throwing", () => {
    sessionStorage.setItem(KEY, "¯\\_(ツ)_/¯");
    expect(readSelectedDate(KEY)).toBeNull();
  });

  it("uses sessionStorage, not localStorage", () => {
    writeSelectedDate(KEY, "2026-07-30");
    expect(sessionStorage.getItem(KEY)).toBe("2026-07-30");
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});

describe("subscribeToSelectedDate", () => {
  it("subscribes and unsubscribes without throwing", () => {
    let calls = 0;
    const unsubscribe = subscribeToSelectedDate(() => {
      calls += 1;
    });

    window.dispatchEvent(new Event("storage"));
    expect(calls).toBe(1);

    unsubscribe();
    window.dispatchEvent(new Event("storage"));
    expect(calls).toBe(1);
  });
});
