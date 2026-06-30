import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const CALENDAR_DIR = join(process.cwd(), "src/features/calendar");

// Recursively collect all .ts/.tsx source files in src/features/calendar/
// EXCLUDING test files (they contain pattern strings as test data).
function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...collectSourceFiles(full));
    } else if ((full.endsWith(".ts") || full.endsWith(".tsx")) && !full.includes("__tests__")) {
      out.push(full);
    }
  }
  return out;
}

// Patterns that indicate day-index / next-day arithmetic (FORBIDDEN in calendar/).
const FORBIDDEN_PATTERNS = [
  /nextDay/i,
  /dayIndex\s*[\+\-]\s*1/,
  /dayIndex\s*%\s/,
  /\bday\s*\+\s*1\b/,
  /getDate\(\)\s*\+\s*1/,
];

// w1 frozen files — skipped for arithmetic check (pre-date w2).
const W1_FROZEN = [
  "src/features/calendar/lib/selectors.ts",
  "src/features/calendar/types.ts",
];

// Files where `new Date()` is allowed:
// - the hook (computes `today` once)
// - CalendarGrid (initial month display — NOT today computation)
// - w1 frozen files (pre-date w2, not edited by us)
const ALLOWED_NEW_DATE_FILES = [
  "src/features/calendar/hooks/useScheduledSessions.ts",
  "src/features/calendar/components/CalendarGrid.tsx",
  ...W1_FROZEN,
];

describe("PARITY GREP-GUARD (extended to cover hook + components)", () => {
  const files = collectSourceFiles(CALENDAR_DIR);

  it("no day-index / next-day arithmetic in src/features/calendar/** (excl. w1 frozen)", () => {
    const violations: string[] = [];
    for (const file of files) {
      const rel = relative(process.cwd(), file);
      if (W1_FROZEN.includes(rel)) continue;
      const content = readFileSync(file, "utf-8");
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(content)) {
          violations.push(`${rel}: matches ${pattern}`);
        }
      }
    }
    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("only allowed files use new Date() in calendar/", () => {
    const newDateFiles: string[] = [];
    for (const file of files) {
      const rel = relative(process.cwd(), file);
      const content = readFileSync(file, "utf-8");
      if (/new Date\(\s*\)/.test(content)) {
        newDateFiles.push(rel);
      }
    }
    for (const f of newDateFiles) {
      expect(ALLOWED_NEW_DATE_FILES).toContain(f);
    }
  });

  it("no `apex-` or `canonical_user_id` legacy strings in source files", () => {
    const violations: string[] = [];
    for (const file of files) {
      const rel = relative(process.cwd(), file);
      const content = readFileSync(file, "utf-8");
      if (/apex-/.test(content)) violations.push(`${rel}: apex-`);
      if (/canonical_user_id/.test(content))
        violations.push(`${rel}: canonical_user_id`);
    }
    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("DID NOT edit types.ts or selectors.ts (w1 frozen — check exports unchanged)", () => {
    const typesContent = readFileSync(
      join(CALENDAR_DIR, "types.ts"),
      "utf-8",
    );
    expect(typesContent).toContain("ScheduledSession");
    expect(typesContent).toContain("ScheduledSessionStatus");
    expect(typesContent).toContain("ScheduledSessionKind");

    const selectorsContent = readFileSync(
      join(CALENDAR_DIR, "lib/selectors.ts"),
      "utf-8",
    );
    expect(selectorsContent).toContain("buildScheduledSessions");
    expect(selectorsContent).toContain("getSessionsForDate");
    expect(selectorsContent).toContain("deriveStatus");
  });
});
