import { describe, it, expect } from "vitest";

import { derivePace, formatPace } from "../lib/volume";
import type { CardioPayload } from "../types";

describe("cardio summary payload", () => {
  it("requires-duration: a payload without durationSeconds is a type error", () => {
    // @ts-expect-error durationSeconds is REQUIRED on CardioPayload
    const bad: CardioPayload = { distanceMeters: 1500 };
    // reference so the binding is used; the assertion of interest is the compile error above.
    expect(bad).toBeDefined();
  });

  it("pace-derived: 1500m in 360s → 240 s/km (4:00/km); pace is NOT stored", () => {
    const cardio: CardioPayload = {
      durationSeconds: 360,
      distanceMeters: 1500,
    };
    const secondsPerKm = derivePace(cardio);
    expect(secondsPerKm).toBe(240);
    expect(formatPace(secondsPerKm!)).toBe("4:00/km");
    // the payload itself carries no `pace` field
    expect("pace" in cardio).toBe(false);
  });

  it("pace-derived: returns null when distance is missing", () => {
    expect(derivePace({ durationSeconds: 600 })).toBeNull();
  });

  it("optional-fields: distance/calories/avgHr/maxHr are all omittable", () => {
    const minimal: CardioPayload = { durationSeconds: 1800 };
    expect(minimal.durationSeconds).toBe(1800);
    expect(minimal.distanceMeters).toBeUndefined();
    expect(minimal.calories).toBeUndefined();
    expect(minimal.avgHr).toBeUndefined();
    expect(minimal.maxHr).toBeUndefined();
  });
});
