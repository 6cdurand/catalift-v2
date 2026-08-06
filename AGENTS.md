# Catalift v2 — Global Agent Rules

> **START HERE:** read `.windsurf/rules/00-session-bootstrap.md` before anything else. It defines the
> multi-root workspace boundaries (v2 = write, v1 `apex-fitness` = read-only), the v1 → v2 porting
> protocol, and which stray rules in the workspace do **not** apply to you.

> These rules apply to every worker (any Cascade chat or executor) working in this repo.
> They are always-on. Feature-specific rules are in `src/features/*/AGENTS.md`.

## Workspace boundaries (summary — full version in the bootstrap rule)

- Write app code in `catalift-v2`. Supabase project `igagmdkdzjkxrwnyvgqk`.
- `catalift-web/apex-fitness` is **READ-ONLY** reference. Never edit it. Its Supabase project
  `pjkqfoeahcpvugolmxew` is v1 **live production** — never run migrations or writes against it.
- Ignore `apex-fitness/.windsurf/rules/catalift-executor.md` — it is v1's rule file.
- Ignore any memory claiming you cannot write app code — that is command-center context leaking.
- Porting means **opening and reading the v1 file**, never porting from a description. Proof blocks
  for ports must show v1 vs v2 side-by-side with file paths and line numbers.

## How "agents" work here (read this first)

There are **no running bots inside this repo.** An "agent" is just an `AGENTS.md` **rules file** in a
folder. When you open a chat and work in a folder, you read that folder's `AGENTS.md` and follow it.
The "agent" = the rules + whoever is doing the work right now.

- This file (`/AGENTS.md`) = global rules, always apply.
- Each work area has its own rules file (the "domain lanes"):
  - `src/features/auth/`, `workout-engine/`, `trainer-ops/`, `data-sync/`, `messaging/` → feature lanes
  - `src/components/` → **design** lane · `tests/` → **qa** lane · `supabase/migrations/` → schema lane
  - `mobile` lane: added when Capacitor is set up (no native folder yet).
- One worker works one lane at a time, reading that lane's rules. Nothing runs in the background.

**Who runs the work** (executor model, decided in command-center `plans/v2_executor_model.md`):
Cascade-paste for the foundation + anything touching auth/RLS/payments/data-sync; OpenClaw overnight
for verbatim bulk copy; Ollama for batch. Not Devin.

## Critical invariants

1. **No cross-feature imports.** `src/features/auth/` cannot import from `src/features/workout-engine/`. Use shared `lib/`, `components/`, `hooks/`, `utils/`. Enforced by ESLint `no-restricted-imports`. **Full spec inlined below.**

2. **Every Supabase write must be `await`ed with retry.** No fire-and-forget. No `.then()` chains. Use `await` + try/catch + retry on failure. Applies to **every** write site anywhere under `src/` — not just `data-sync/`.

3. **Every table gets RLS.** No `USING (true)` policies. No public read access. **Full spec inlined below.**

4. **All localStorage/cache keys must use `userScopedKey()`.** Import from `@/utils/user-scoped-key`. Never use bare string keys — they leak across accounts.

5. **Every PR must include a filled proof block.** See `.github/pull_request_template.md`. No proof, no merge.

### Invariant 1 in full — import boundaries

> Inlined here deliberately. This is a Class-B correctness gate and `AGENTS.md` is the most reliably
> loaded rules file in the repo. The canonical copy is `.windsurf/rules/import-boundaries.md`; if the
> two ever disagree, treat the stricter one as binding and reconcile them.

Features in `src/features/` are self-contained domains. They may NOT import from other features.

**Allowed imports from a feature:**

- `@/lib/*` — shared infrastructure (supabase clients, storage, sentry)
- `@/components/ui/*` — shared UI components
- `@/hooks/*` — shared hooks
- `@/config/*` — constants, env, feature-flags
- `@/types/*` — shared types
- `@/utils/*` — shared utilities
- Relative imports within the same feature (`./`, `../`)

**Forbidden imports from a feature:**

- `@/features/<other-feature>/*` — cross-feature imports
- `@/app/*` — app router files (features don't import pages)

Also enforced by ESLint `no-restricted-imports` in `eslint.config.mjs`, which blocks `@/features/*/*`.
If you hit that lint error you've violated the boundary — fix it by moving the shared code to
`lib/`, `components/`, `hooks/`, or `utils/`. Do not add an eslint-disable.

### Invariant 3 in full — RLS required

> Inlined here deliberately, same reasoning. Canonical copy is `.windsurf/rules/rls-required.md`;
> the policy template lives in `supabase/migrations/AGENTS.md`.

Every table in Supabase must have Row Level Security enabled with policies that check `auth.uid()`.

1. **Every `CREATE TABLE` must include `ENABLE ROW LEVEL SECURITY`.**
2. **Every table must have at minimum SELECT, INSERT, UPDATE, DELETE policies** that check `trainer_id = auth.uid()` or `client_id = auth.uid()`.
3. **No `USING (true)` policies.** This makes the table world-readable. v1 had 11+ tables with this — it caused a SEV-0 PII exposure (BUG-N3).
4. **No `ALTER TABLE ... DISABLE ROW LEVEL SECURITY`.** Ever.
5. **Storage buckets must have RLS policies too.** Not just database tables.
6. **Migrations target v2 project `igagmdkdzjkxrwnyvgqk` only.** Never v1's `pjkqfoeahcpvugolmxew`.

All migrations are Class B (security-critical) and get reviewed before merge. No RLS, no merge.

## Gates (must pass before merge)

- `npx tsc --noEmit` — zero errors
- `npm run lint` — zero errors (includes import boundary check)
- `npx playwright test` — all pass (if UI-facing)

## Stack

- Next.js 16 App Router
- Supabase (auth + DB + storage)
- Tailwind v4
- Zustand + persist middleware
- Playwright (e2e)

## File structure

```
src/features/<domain>/    ← self-contained: api + components + hooks + stores + types + __tests__
src/components/ui/        ← shared UI (shadcn/ui)
src/lib/                  ← shared infrastructure (supabase clients, storage, sentry)
src/hooks/                ← shared hooks
src/config/               ← constants, env, feature-flags
src/types/                ← shared types
src/utils/                ← shared utilities
```

## Feature flags

Disabled by default in `src/config/feature-flags.ts`: strengthRating, medals, socialFeed, booking, healthData, notifications. Enable only when the feature is production-ready.

## When you don't know something

- Read `ARCHITECTURE.md` for the full architecture spec
- Read `docs/workflow.md` for the issue-to-merge pipeline
- Read the nearest `AGENTS.md` for domain-specific rules
- Check `src/features/*/types.ts` for domain type definitions
- Never guess. Read the file.
