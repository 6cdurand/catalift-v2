import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Guard against v1 anti-patterns the v2 port must DROP (G-01/G-02/G-03/G-16).
 * If any reappear in app/feature source (outside __tests__), the build fails.
 */
const FORBIDDEN = [
  // auth credential footguns (G-02 — Supabase Auth only)
  "hashPassword",
  "password_hash",
  // unscoped localStorage caches / token eviction (G-03, INC-003)
  "apex-",            // v1 localStorage key prefix: apex-users, apex-workouts, ...
  "localStorage.clear",
  // v1 Zustand god-stores (G-16 — separate store per resource)
  "@/lib/store",
  // v1 identity divergence (G-01 — use auth.uid()/users.id directly)
  "canonical_user_id",
  // v1 god-file user fetch / writes
  "fetchAllUsersFromSupabase",
  "updateUserInSupabase",
];

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
