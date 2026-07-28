import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Parity law grep-guard (BUG-001/010): the Today surface must NOT compute a
// next day / rotation itself — "Up Next" comes ONLY from getNextProgramWorkout
// via useActiveClientProgram. This asserts ZERO day-index / rotation math lives
// anywhere under src/app/(app)/today/**.
//
// Extended for the athlete day strip (Phase 1b) with the day-index patterns from
// src/features/calendar/lib/__tests__/parity-guard.test.ts:24-30, and an
// explicit check that the new/changed day-selector files are in the scan.
// Calendar-DATE arithmetic (which dates are in the visible week) is allowed only
// in the shared src/lib/week.ts, never here.

const TODAY_DIR = dirname(dirname(fileURLToPath(import.meta.url)));

// Files this lane touched — pinned so a rename can never silently drop them.
const GUARDED_FILES = [
  "DayStrip.tsx",
  "TodaySurface.tsx",
  "page.tsx",
];

// Patterns that would indicate local next-day / day-of-week arithmetic.
//
// NOTE ON `/nextDay/i`: the calendar guard's first pattern is deliberately NOT
// reused verbatim. `page.tsx` and `TodaySurface.tsx` legitimately FORWARD the
// authority's own output as the `nextDayIndex={...}` prop of SwapDayDialog /
// WeeklyProgressStrip. The narrower pattern below still catches ASSIGNMENT
// forms (`const nextDayIso = …`), which is what local computation looks like,
// while skipping JSX prop passing (`=` immediately followed by `{`).
const FORBIDDEN: { label: string; re: RegExp }[] = [
  { label: ".getDay() day-of-week math", re: /\.getDay\s*\(/ },
  { label: "nextWorkoutIndex rotation", re: /nextWorkoutIndex/ },
  { label: "modulo-7 rotation (% 7)", re: /%\s*7\b/ },
  { label: "getUTCDay() day-of-week math", re: /\.getUTCDay\s*\(/ },
  { label: "locally computed nextDay", re: /\bnextDay\w*\s*=\s*[^={=]/ },
  { label: "dayIndex +/- 1", re: /dayIndex\s*[+-]\s*1/ },
  { label: "dayIndex modulo", re: /dayIndex\s*%\s/ },
  { label: "day + 1", re: /\bday\s*\+\s*1\b/ },
  { label: "getDate() + 1", re: /getDate\(\)\s*\+\s*1/ },
  { label: "setDate() date arithmetic", re: /\.setDate\s*\(/ },
];

function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "__tests__") continue; // guard covers shipped code, not tests
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe("Today parity guard", () => {
  const files = collectSourceFiles(TODAY_DIR);

  it("finds the Today source files to scan", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("covers the day-selector files this lane added or changed", () => {
    for (const name of GUARDED_FILES) {
      expect(files.some((f) => f.endsWith(`/${name}`))).toBe(true);
    }
  });

  it("contains NO day-index / rotation math in app/(app)/today/**", () => {
    const violations: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      for (const { label, re } of FORBIDDEN) {
        if (re.test(src)) {
          violations.push(`${file}: ${label}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
