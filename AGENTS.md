# Catalift v2 — Global Agent Rules

> These rules apply to every worker (any Cascade chat or executor) working in this repo.
> They are always-on. Feature-specific rules are in `src/features/*/AGENTS.md`.

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

1. **No cross-feature imports.** `src/features/auth/` cannot import from `src/features/workout-engine/`. Use shared `lib/`, `components/`, `hooks/`, `utils/`. Enforced by ESLint `no-restricted-imports`.

2. **Every Supabase write must be `await`ed with retry.** No fire-and-forget. No `.then()` chains. Use `await` + try/catch + retry on failure.

3. **Every table gets RLS.** No `USING (true)` policies. No public read access. See `supabase/migrations/AGENTS.md`.

4. **All localStorage/cache keys must use `userScopedKey()`.** Import from `@/utils/user-scoped-key`. Never use bare string keys — they leak across accounts.

5. **Every PR must include a filled proof block.** See `.github/pull_request_template.md`. No proof, no merge.

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
