import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";

// PARITY GREP-GUARD for the trainer Today schedule lane.
//
// Mirrors src/features/calendar/lib/__tests__/parity-guard.test.ts:24-30.
// The trainer week schedule and the day-selector must NEVER compute which
// program day a client trains — that comes ONLY from getNextProgramWorkout +
// buildScheduledSessions. Calendar-date arithmetic for the visible week is
// allowed, and is confined to the pure `lib/week.ts` helper.

const FORBIDDEN_PATTERNS = [
  /nextDay/i,
  /dayIndex\s*[\+\-]\s*1/,
  /dayIndex\s*%\s/,
  /\bday\s*\+\s*1\b/,
  /getDate\(\)\s*\+\s*1/,
];

const GUARDED_FILES = [
  "src/features/trainer-ops/hooks/useTrainerWeekSchedule.ts",
  "src/features/trainer-ops/lib/week.ts",
  "src/app/(app)/today/TrainerDayStrip.tsx",
  "src/app/(app)/today/TrainerDaySchedule.tsx",
  "src/app/(app)/today/TrainerTodaySurface.tsx",
];

describe("TRAINER SCHEDULE PARITY GREP-GUARD", () => {
  it("scans every new trainer-schedule source file", () => {
    for (const rel of GUARDED_FILES) {
      expect(() => readFileSync(join(process.cwd(), rel), "utf-8")).not.toThrow();
    }
  });

  it("no day-index / next-day arithmetic in the trainer schedule files", () => {
    const violations: string[] = [];
    for (const rel of GUARDED_FILES) {
      const full = join(process.cwd(), rel);
      const content = readFileSync(full, "utf-8");
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(content)) {
          violations.push(`${relative(process.cwd(), full)}: matches ${pattern}`);
        }
      }
    }
    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("the hook resolves the program day through the shared selectors only", () => {
    const hook = readFileSync(
      join(process.cwd(), "src/features/trainer-ops/hooks/useTrainerWeekSchedule.ts"),
      "utf-8",
    );
    expect(hook).toContain("selectActivePrograms");
    expect(hook).toContain("getNextProgramWorkout");
    expect(hook).toContain("buildScheduledSessionsResult");
    expect(hook).toContain("deriveCompletedDayIndices");
  });

  it("the completedKey format stays exactly program:<programId>:<dayIndex>:<date>", () => {
    const hook = readFileSync(
      join(process.cwd(), "src/features/trainer-ops/hooks/useTrainerWeekSchedule.ts"),
      "utf-8",
    );
    expect(hook).toContain("`program:${programId}:${dayIndex}:${date}`");
  });
});
