# Devin Guidelines — Catalift v2

## General rules

1. **Read `ARCHITECTURE.md` first** before any task. It defines module boundaries and critical design rules.
2. **Stay in your module.** Each GitHub Issue has a domain label. Only touch files in that module. If a change requires cross-module work, note it in the PR and flag for conductor review.
3. **PR-only.** Never push to `main`. Always create a feature branch + PR.
4. **Every PR must pass:** `tsc --noEmit` clean + lint + Playwright e2e smoke. CI enforces this.
5. **Write tests for every feature.** Unit tests in `tests/unit/<module>/`. Integration tests in `tests/integration/<module>/`. E2e tests in `tests/e2e/`.
6. **Follow existing patterns.** Look at how other modules structure their sync, state, and components before writing new code.

## Coding standards

- **TypeScript strict mode.** No `any` without a comment explaining why.
- **Zustand stores** with `persist` middleware. All persist keys must be user-scoped: `catalift-<resource>-<userId>`.
- **Supabase writes:** always `await` with retry. Use `syncWithRetry(fn, tableName)` from `data-sync` module. Never fire-and-forget.
- **Supabase reads:** use scoped queries or RPCs. Never fetch full tables of user data.
- **RLS:** every new table gets strict RLS with `canonical_user_id()`. No `USING(true)` policies.
- **Components:** shadcn/ui + Tailwind. Mobile-first responsive. WCAG 2.1 AA accessibility.
- **No `console.log` in production code.** Use Sentry for error tracking. Debug logs only in dev.

## Module-specific rules

### auth module
- Supabase Auth is the ONLY credential source
- No localStorage fast-path, no `password_hash` column
- `onAuthStateChange` handles `SIGNED_OUT` explicitly (clears all stores)
- Account deletion = server-side cascade

### workout-engine module
- Volume = `SUM(set.weight * set.reps)` across ALL sets, not MAX
- PB detection via server-side RPC (`checkAndRecordPBs`)
- Workout runtime state persisted to IndexedDB (survives tab switch)
- One unified `completeWorkout(session)` function for the completion pipeline

### trainer-ops module
- One session-counting authority (app-side ledger + one offset)
- No server triggers that mutate offset columns
- Calendar events use the clean `calendar_events` model (not legacy)
- Booking slots + pricing tiers for the booking system

### messaging module
- Supabase Realtime on messages + notifications
- `seen_at` on notifications, badge = `WHERE seen_at IS NULL`
- Mark-all-read on notification panel open

### data-sync module
- Split into per-domain sync modules (each <300 LOC)
- IndexedDB for bulky caches, localStorage for auth only
- Hydrate = MERGE (server-wins), never REPLACE
- `visibilitychange` + `App.resume` → `hydrateForUser(userId)`
- This is the ONLY module that writes SQL migrations

### mobile module
- `WKAppBoundDomains` + `limitsNavigationsToAppBoundDomains: true` from day one
- Push notifications via Capacitor push plugin (APNs + FCM)
- Health data via Capacitor health plugin (HealthKit + Google Fit)
- Google OAuth via native `ASWebAuthenticationSession`
- Sign in with Apple from day one

## PR checklist

Before creating a PR, verify:
- [ ] `tsc --noEmit` clean
- [ ] Lint passes
- [ ] E2e smoke tests pass
- [ ] New tests written for new features
- [ ] No `console.log` in production code
- [ ] All writes use `syncWithRetry` (no fire-and-forget)
- [ ] Persist keys are user-scoped
- [ ] RLS policies added for any new tables
- [ ] `ARCHITECTURE.md` updated if module boundaries changed

## When you're stuck

- If a task is unclear, comment on the GitHub Issue with your question
- If you hit a cross-module dependency, implement your part and flag the dependency in the PR
- If you find a bug in another module, don't fix it — create a new Issue with the `bug` label and the module label
