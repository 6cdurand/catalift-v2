import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Guards the rule-loading mechanism itself.
 *
 * Windsurf declares a rule's activation mode via a `trigger:` key in the
 * frontmatter. An unrecognised key (e.g. `always_on: true` or `glob: "src/**"`)
 * leaves the rule with no activation mode, so it is silently NEVER injected
 * into Cascade's context. The file still looks correct on disk, which is why
 * this failed undetected: `rls-required` and `import-boundaries` were dark
 * while appearing perfectly well-formed.
 *
 * Scope: v2's own rules only. v1 (`apex-fitness`) is read-only reference and
 * is deliberately not scanned.
 *
 * Ref: https://docs.windsurf.com/windsurf/cascade/memories#activation-modes
 */

const RULES_DIR = resolve(__dirname, "../../.windsurf/rules");

const VALID_TRIGGERS = ["always_on", "glob", "model_decision", "manual"];

/**
 * These are trigger *values*, not frontmatter keys. Seeing one in key position
 * means someone wrote `always_on: true` instead of `trigger: always_on`.
 */
const VALUES_MISUSED_AS_KEYS = new Set(VALID_TRIGGERS);

type Frontmatter = Map<string, string>;

function readRuleFiles(): string[] {
  return readdirSync(RULES_DIR)
    .filter((name) => name.endsWith(".md"))
    .sort();
}

/**
 * Minimal frontmatter reader. Returns null when the file has no `---` block.
 * Splits on the first colon only, so values containing colons survive intact.
 */
function parseFrontmatter(raw: string): Frontmatter | null {
  const lines = raw.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return null;

  const closing = lines.indexOf("---", 1);
  if (closing === -1) return null;

  const out: Frontmatter = new Map();
  for (const line of lines.slice(1, closing)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = line
      .slice(colon + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    out.set(key, value);
  }
  return out;
}

function findProblems(file: string, raw: string): string[] {
  const problems: string[] = [];
  const fm = parseFrontmatter(raw);

  if (fm === null) {
    problems.push(
      `${file}: no frontmatter block — expected a leading \`---\` fence declaring \`trigger:\``,
    );
    return problems;
  }

  for (const key of fm.keys()) {
    if (VALUES_MISUSED_AS_KEYS.has(key)) {
      problems.push(
        `${file}: offending key \`${key}:\` — that is a trigger value, not a key. Use \`trigger: ${key}\`` +
          (key === "glob" ? " plus a separate `globs:` pattern" : ""),
      );
    }
  }

  const trigger = fm.get("trigger");

  if (trigger === undefined) {
    problems.push(
      `${file}: missing key \`trigger:\` — must be one of ${VALID_TRIGGERS.join(", ")}. ` +
        `Without it the rule is never injected into Cascade's context.`,
    );
  } else if (!VALID_TRIGGERS.includes(trigger)) {
    problems.push(
      `${file}: offending key \`trigger: ${trigger}\` — not a recognised value. ` +
        `Expected one of ${VALID_TRIGGERS.join(", ")}.`,
    );
  } else if (trigger === "glob") {
    const globs = fm.get("globs");
    if (globs === undefined) {
      problems.push(
        `${file}: declares \`trigger: glob\` but is missing the required \`globs:\` key.`,
      );
    } else if (globs === "") {
      problems.push(
        `${file}: declares \`trigger: glob\` but \`globs:\` is empty — the rule would match nothing.`,
      );
    }
  }

  return problems;
}

describe("windsurf rule frontmatter is valid", () => {
  const files = readRuleFiles();

  it("discovers rule files to validate", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file} declares a loadable trigger`, () => {
      const raw = readFileSync(join(RULES_DIR, file), "utf8");
      expect(findProblems(file, raw)).toEqual([]);
    });
  }

  it("reports every offending file at once", () => {
    const problems = files.flatMap((file) =>
      findProblems(file, readFileSync(join(RULES_DIR, file), "utf8")),
    );
    expect(problems).toEqual([]);
  });
});

describe("findProblems detection logic", () => {
  it("rejects the `always_on: true` mistake that silently disabled these rules", () => {
    const problems = findProblems(
      "example.md",
      ["---", "always_on: true", "description: x", "---", "", "# Body"].join("\n"),
    );
    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain("offending key `always_on:`");
    expect(problems[0]).toContain("Use `trigger: always_on`");
    expect(problems[1]).toContain("missing key `trigger:`");
  });

  it("rejects the `glob: \"src/**\"` mistake", () => {
    const problems = findProblems(
      "example.md",
      ["---", 'glob: "src/**"', "---", "", "# Body"].join("\n"),
    );
    expect(problems.some((p) => p.includes("offending key `glob:`"))).toBe(true);
    expect(problems.some((p) => p.includes("plus a separate `globs:` pattern"))).toBe(true);
  });

  it("rejects an unrecognised trigger value", () => {
    const problems = findProblems(
      "example.md",
      ["---", "trigger: sometimes", "---"].join("\n"),
    );
    expect(problems).toEqual([
      "example.md: offending key `trigger: sometimes` — not a recognised value. " +
        "Expected one of always_on, glob, model_decision, manual.",
    ]);
  });

  it("rejects `trigger: glob` with no globs key", () => {
    const problems = findProblems(
      "example.md",
      ["---", "trigger: glob", "description: x", "---"].join("\n"),
    );
    expect(problems).toEqual([
      "example.md: declares `trigger: glob` but is missing the required `globs:` key.",
    ]);
  });

  it("rejects `trigger: glob` with an empty globs key", () => {
    const problems = findProblems(
      "example.md",
      ["---", "trigger: glob", "globs:", "---"].join("\n"),
    );
    expect(problems[0]).toContain("`globs:` is empty");
  });

  it("rejects a file with no frontmatter", () => {
    expect(findProblems("example.md", "# Just a heading\n")).toEqual([
      "example.md: no frontmatter block — expected a leading `---` fence declaring `trigger:`",
    ]);
  });

  it("rejects an unterminated frontmatter fence", () => {
    const problems = findProblems(
      "example.md",
      ["---", "trigger: always_on", "", "# Body with no closing fence"].join("\n"),
    );
    expect(problems[0]).toContain("no frontmatter block");
  });

  it("accepts a valid always_on rule", () => {
    expect(
      findProblems(
        "example.md",
        ["---", "trigger: always_on", "description: x", "---", "", "# Body"].join("\n"),
      ),
    ).toEqual([]);
  });

  it("accepts a valid glob rule", () => {
    expect(
      findProblems(
        "example.md",
        ["---", "trigger: glob", "globs: src/**/*.ts", "---"].join("\n"),
      ),
    ).toEqual([]);
  });

  it("accepts each remaining valid trigger", () => {
    for (const trigger of ["model_decision", "manual"]) {
      expect(
        findProblems("example.md", ["---", `trigger: ${trigger}`, "---"].join("\n")),
      ).toEqual([]);
    }
  });

  it("preserves values containing colons, so descriptions do not break parsing", () => {
    expect(
      findProblems(
        "example.md",
        ["---", "trigger: always_on", "description: Note: use await, not .then()", "---"].join(
          "\n",
        ),
      ),
    ).toEqual([]);
  });
});
