// P-06-L1 — tab identity (inventory row 8). v1 seeds the tab from `?tab=` and
// never validates it, so a typo'd deep link renders an empty screen.

import { describe, it, expect } from "vitest";
import { CLIENT_TABS, DEFAULT_CLIENT_TAB, resolveTab } from "../client-tabs";

describe("client file tabs", () => {
  it("keeps v1's tab order exactly", () => {
    expect([...CLIENT_TABS]).toEqual([
      "overview",
      "program",
      "progress",
      "messages",
      "payments",
    ]);
  });

  it("seeds the tab from ?tab= for every real tab", () => {
    for (const tab of CLIENT_TABS) {
      expect(resolveTab(tab)).toBe(tab);
    }
  });

  it("falls back to overview when ?tab= is absent", () => {
    expect(resolveTab(null)).toBe(DEFAULT_CLIENT_TAB);
    expect(resolveTab(undefined)).toBe("overview");
    expect(resolveTab("")).toBe("overview");
  });

  it("falls back to overview when ?tab= is garbage", () => {
    expect(resolveTab("payment")).toBe("overview");
    expect(resolveTab("PAYMENTS")).toBe("overview");
    expect(resolveTab("../../etc/passwd")).toBe("overview");
  });
});
