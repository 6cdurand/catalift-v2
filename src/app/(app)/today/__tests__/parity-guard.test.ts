import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Parity law grep-guard (BUG-001/010): the Today surface must NOT compute a
// next day / rotation itself — "Up Next" comes ONLY from getNextProgramWorkout
// via useActiveClientProgram. This asserts ZERO day-index / rotation math lives
// anywhere under src/app/(app)/today/**.

const TODAY_DIR = dirname(dirname(fileURLToPath(import.meta.url)));

// Patterns that would indicate local next-day / day-of-week arithmetic.
const FORBIDDEN: { label: string; re: RegExp }[] = [
  { label: ".getDay() day-of-week math", re: /\.getDay\s*\(/ },
  { label: "nextWorkoutIndex rotation", re: /nextWorkoutIndex/ },
  { label: "modulo-7 rotation (% 7)", re: /%\s*7\b/ },
  { label: "getUTCDay() day-of-week math", re: /\.getUTCDay\s*\(/ },
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
