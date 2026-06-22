import { describe, it, expect } from "vitest";

import { mergeById } from "../lib/hydrate-merge";

interface Row {
  id: string;
  name?: string;
  weight?: number | null;
  meta?: { a?: number; b?: number };
}

describe("mergeById", () => {
  it("adds new incoming rows and keeps existing ones", () => {
    const merged = mergeById<Row>(
      [{ id: "1", name: "a" }],
      [{ id: "2", name: "b" }],
    );

    expect(merged.map((r) => r.id).sort()).toEqual(["1", "2"]);
  });

  it("lets incoming win per-field while preserving untouched fields", () => {
    const merged = mergeById<Row>(
      [{ id: "1", name: "old", weight: 100 }],
      [{ id: "1", name: "new" }],
    );

    expect(merged.find((r) => r.id === "1")).toMatchObject({
      name: "new",
      weight: 100,
    });
  });

  it("deep-merges nested plain objects", () => {
    const merged = mergeById<Row>(
      [{ id: "1", meta: { a: 1, b: 2 } }],
      [{ id: "1", meta: { b: 9 } }],
    );

    expect(merged[0].meta).toEqual({ a: 1, b: 9 });
  });

  it("treats null as a real value that overwrites", () => {
    const merged = mergeById<Row>(
      [{ id: "1", weight: 100 }],
      [{ id: "1", weight: null }],
    );

    expect(merged[0].weight).toBeNull();
  });

  // v1 data-loss regression: a partial server payload must NOT drop an in-flight
  // local row, nor wipe fields the payload omits.
  it("never drops an in-flight row absent from a partial incoming payload", () => {
    const existing: Row[] = [
      { id: "inflight", name: "just-saved-locally", weight: 80 },
      { id: "server-1", name: "stale", weight: 100 },
    ];
    // Server fetch returned BEFORE the in-flight write persisted, and carried
    // only a partial payload for server-1 (no weight field).
    const incoming: Row[] = [{ id: "server-1", name: "fresh" }];

    const merged = mergeById(existing, incoming);

    expect(merged.find((r) => r.id === "inflight")).toEqual({
      id: "inflight",
      name: "just-saved-locally",
      weight: 80,
    });
    expect(merged.find((r) => r.id === "server-1")).toMatchObject({
      name: "fresh", // incoming wins
      weight: 100, // omitted field preserved, not wiped
    });
  });
});
