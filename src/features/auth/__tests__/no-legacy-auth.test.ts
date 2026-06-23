import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Guard against the v1 auth anti-patterns the spec says to DROP (G-02/G-03).
 * If any of these reappear in app/feature source, the build fails.
 *
 * - `hashPassword`        — custom password hashing (Supabase Auth only)
 * - `apex-users`          — unscoped localStorage credential cache
 * - `localStorage.clear`  — evicts the sb-* auth token (INC-003 outage)
 * - `@/lib/store`         — v1 auth/trainer Zustand god-store
 */
const FORBIDDEN = ["hashPassword", "apex-users", "localStorage.clear", "@/lib/store"];

const SRC = resolve(__dirname, "../../../");
const CODE_EXT = /\.(ts|tsx)$/;

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip test directories — tests legitimately reference the patterns.
      if (entry.name === "__tests__") continue;
      out.push(...collectFiles(full));
    } else if (CODE_EXT.test(entry.name) && !entry.name.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

describe("no legacy v1 auth patterns in src/", () => {
  const files = collectFiles(SRC);

  it("finds source files to scan", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const pattern of FORBIDDEN) {
    it(`contains no occurrences of \`${pattern}\``, () => {
      const offenders = files.filter((f) =>
        readFileSync(f, "utf8").includes(pattern),
      );
      expect(offenders).toEqual([]);
    });
  }
});
