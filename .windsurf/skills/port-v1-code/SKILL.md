---
name: port-v1-code
description: Ports proven v1 code into v2 structure — identifies the v1 file, adapts to v2 architecture, checks against v1 lessons. Use when porting a working v1 feature to v2.
---

# Port v1 Code

When asked to port a v1 feature to v2, follow this procedure.

> **Hard prerequisite:** v1 lives at `/Users/christofit7/Desktop/catalift/catalift-web/apex-fitness` and
> is **READ-ONLY**. Never edit it, and never run Supabase writes/migrations against v1's project
> `pjkqfoeahcpvugolmxew` (live production). See `.windsurf/rules/00-session-bootstrap.md`.

## Steps

1. **OPEN and READ the v1 source file(s) with `read_file`.** The Issue should list the v1 paths; if it
   doesn't, find them with `code_search`/`grep_search` scoped to the `apex-fitness` root. Porting from
   a description, a summary, or memory is **not allowed** — you must have read the actual v1 file in
   this session before writing v2 code.

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

6. **Create PR with proof block, including the side-by-side port proof:**

```
### Port proof (v1 → v2)
- **v1 source:** @/Users/christofit7/Desktop/catalift/catalift-web/apex-fitness/<path>:<start>-<end>
- **v2 destination:** @/Users/christofit7/Desktop/catalift/catalift-v2/<path>:<start>-<end>
- **Read the v1 file?** Y (required — N is not an acceptable answer)
- **Deviations from v1:** [none / list each with reason]
- **v1 lessons applied:** [which ARCHITECTURE.md rules this port had to satisfy]
```

## What NOT to port

- v1's `password_hash` login path (dead code, don't bring it)
- v1's `fetchAllUsersFromSupabase()` (PII disclosure bug, don't bring it)
- v1's `supabaseSync.ts` god-file (split into domain-specific files instead)
- v1's unscoped cache keys (convert to user-scoped)
- v1's fire-and-forget patterns (convert to await + retry)
