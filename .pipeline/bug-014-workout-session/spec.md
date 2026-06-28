# .pipeline/bug-014-workout-session/spec.md — BUG-014: workout save uses stub-user-id

**Class:** A (app code only — no schema, no auth-policy change). **Model:** GLM 5.2.
**Branch from:** main → `fix/bug-014-workout-active-real-session`. Push branch; conductor opens the PR.

## Objective
Replace the hardcoded fake user on the active-workout screen with the real Supabase session user,
so workout writes send a valid uuid. BUG-013 (the RLS 42501 that also blocked this write) is already
FIXED on staging + merged (migration 00008), so once the real user.id flows through, the write succeeds.

## The problem (current code)
File: `src/app/workout/active/page.tsx` (~lines 113-126)
```ts
const [user, setUser] = useState<{ id: string } | null>(null);
const [loading, setLoading] = useState(true);
...
// Stub auth check (TODO: wire to real useSession hook)
useEffect(() => {
  const stubUser = { id: 'stub-user-id' };
  setUser(stubUser);
  setLoading(false);
}, []);
```
`user.id` flows into `startWorkout({ userId: user.id, ... })` → becomes `workouts.user_id`. Devin QA
(PR #15, ISSUE-2) captured: `POST /rest/v1/workouts → 400 invalid input syntax for type uuid: "stub-user-id"`.

## The fix — USE THE EXISTING HOOK (do not invent one)
`src/features/auth/hooks/use-session.ts` (exported from `@/features/auth`):
```ts
export function useSession(): { user: User | null; loading: boolean }
// reads supabase.auth.getSession(), subscribes to onAuthStateChange, clears persisted stores on SIGNED_OUT.
```
Also `src/features/auth/hooks/use-require-auth.ts` → `useRequireAuth()` = useSession() + auto-redirect to /login.

Changes in `src/app/workout/active/page.tsx`:
1. Delete the stub `useEffect` and the local `user`/`loading` useState it feeds.
2. Replace with `const { user, loading } = useSession();` (import via the existing
   `// eslint-disable-next-line no-restricted-imports` convention already used in this file).
3. Downstream stays the same: `user.id` (now a real uuid) → `startWorkout`. The existing redirect-guard
   already handles unauthenticated (`redirect === 'auth'` → `router.replace('/auth/login')`).
4. Remove the stale `// TODO: wire to real useSession hook` comment + stub eslint-disable.

## E2E implication — DO NOT revert to the stub to make e2e pass
`tests/e2e/workout-straight-set.spec.ts` relies on the stub ("assumes logged in"). After the fix, no
session → redirect to /login → test fails. Correct fix = give the e2e a REAL session. Email confirmation
is DISABLED on the v2 staging Supabase, so programmatic sign-in works. Implement (prefer a):
  (a) a Playwright setup that signs in a dedicated test user via
      `getBrowserClient().auth.signInWithPassword(...)` (signUp if missing) + saves storageState; the
      workout spec reuses it. Stable account e.g. `e2e+workout@catalift.test`.
  (b) if CI lacks a test user, a documented test-only session seed — but a REAL uuid session, never the
      'stub-user-id' literal.
If you genuinely cannot establish a session in CI, STOP and report it as a blocker — do NOT ship a fake user.

## Guardrails (proof block)
```
[ ] G-10 real uuids (no string-literal ids)
[ ] G-11 write paths keep await + retry (don't weaken existing await on finishWorkout)
[ ] no localStorage auth fast-path (useSession is the only credential source)
[ ] grep -rn "stub-user-id" src/ → 0 results
[ ] tsc + eslint + vitest + Playwright e2e all green
```

## Tests (→ tests.md)
- Workout finish writes a row with `user_id` = real session uuid (not a literal).
- Unauthenticated → redirect to /auth/login (redirect-guard path).
- grep-guard: no 'stub-user-id' anywhere in src/.

## Report back (→ changes.md + the conductor's REPORT block)
Branch/commit · Changes (files+symbols) · Schema touched? N · Tests (cmd + counts, how e2e session
is established) · Build · Deviations/risks · Verification still needed by Christo.
