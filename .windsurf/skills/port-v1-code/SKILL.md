---
name: port-v1-code
description: Ports proven v1 code into v2 structure — identifies the v1 file, adapts to v2 architecture, checks against v1 lessons. Use when porting a working v1 feature to v2.
---

# Port v1 Code

When asked to port a v1 feature to v2, follow this procedure:

## Steps

1. **Identify the v1 source file(s).** The Issue will list the v1 file paths. Read them to understand what the code does.

2. **Understand v1 lessons.** Check the Issue context section for v1-specific problems with this code. Common v1 issues:
   - Fire-and-forget writes (must convert to await + retry)
   - Unscoped localStorage keys (must convert to `userScopedKey()`)
   - Permissive RLS (must tighten to `auth.uid()` checks)
   - God-file sync patterns (must split into domain-specific files)
   - `useState` without persistence (must convert to Zustand persist)

3. **Determine the v2 target location:**
   - Auth code → `src/features/auth/`
   - Workout/set/program code → `src/features/workout-engine/`
   - Client/trainer code → `src/features/trainer-ops/`
   - Messaging code → `src/features/messaging/`
   - Sync code → `src/features/data-sync/`
   - Shared UI → `src/components/ui/`
   - Shared utilities → `src/utils/` or `src/lib/`

4. **Adapt the code:**
   - Update imports to v2 paths (`@/features/`, `@/lib/`, `@/utils/`)
   - Convert fire-and-forget writes to await + retry (see `await-write-pattern` rule)
   - Convert bare localStorage keys to `userScopedKey()` (see `user-scoped-keys` rule)
   - Split god-files into domain-specific files (under 300 LOC each)
   - Add proper TypeScript types (no `any` unless absolutely necessary)
   - Follow the feature's `AGENTS.md` rules

5. **Verify:**
   - `npx tsc --noEmit` — zero errors
   - `npm run lint` — zero errors (including import boundary check)
   - `npx playwright test` — all pass (if UI-facing)

6. **Create PR with proof block.** Note in the PR description: "Ported from v1 `<file path>`. Changes: <list of adaptations made>."

## What NOT to port

- v1's `password_hash` login path (dead code, don't bring it)
- v1's `fetchAllUsersFromSupabase()` (PII disclosure bug, don't bring it)
- v1's `supabaseSync.ts` god-file (split into domain-specific files instead)
- v1's unscoped cache keys (convert to user-scoped)
- v1's fire-and-forget patterns (convert to await + retry)
