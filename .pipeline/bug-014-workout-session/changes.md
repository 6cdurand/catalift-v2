# .pipeline/bug-014-workout-session/changes.md — BUG-014 Fix

## Objective
Replace hardcoded fake user on /workout/active with real Supabase session, so workout writes use a valid uuid instead of `'stub-user-id'` (which caused 400 invalid input syntax).

## Files changed

### 1. `src/app/workout/active/page.tsx`
**Before:**
```ts
const [user, setUser] = useState<{ id: string } | null>(null);
const [loading, setLoading] = useState(true);

// Stub auth check (TODO: wire to real useSession hook)
useEffect(() => {
  const stubUser = { id: 'stub-user-id' };
  setUser(stubUser);
  setLoading(false);
}, []);
```

**After:**
```ts
// Real session (BUG-014 fix)
const { user, loading } = useSession();
```

**Changes:**
- Removed local `user`/`loading` useState declarations
- Removed stub auth useEffect with hardcoded `'stub-user-id'`
- Added import: `import { useSession } from '@/features/auth'` (with eslint-disable for no-restricted-imports, consistent with existing pattern)
- Replaced with `useSession()` hook call
- Downstream code unchanged: `user.id` (now real uuid) flows into `startWorkout({ userId: user.id })`

### 2. `tests/e2e/auth-helpers.ts` (NEW)
Helper module for establishing real authenticated sessions in E2E tests.

**Exports:**
- `signInTestUser(page: Page): Promise<void>` — signs in dedicated test user `e2e+workout@catalift.test` via app's /login UI

**Implementation:**
- Ensures test user exists via `supabase.auth.signUp()` (ignores error if user already exists)
- Navigates to `/login`, fills credentials, clicks "Sign In"
- Waits for redirect away from /login (app redirects authenticated users to `/today`)
- Loads .env.local to access `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Playwright doesn't auto-load Next.js env files)

**Why UI sign-in instead of localStorage injection:**
- Supabase SSR uses server-side cookies + localStorage with specific key format
- Direct localStorage injection fragile across Supabase client versions
- UI sign-in guaranteed to work exactly as production users experience
- Email confirmation disabled on staging, so sign-in succeeds immediately

### 3. `tests/e2e/workout-straight-set.spec.ts`
**Before:**
```ts
test.beforeEach(async ({ page }) => {
  // Stub: assumes logged in (real auth is Class B)
  await page.goto('/workout/active');
});
```

**After:**
```ts
import { signInTestUser } from './auth-helpers';

test.beforeEach(async ({ page }) => {
  // Establish real authenticated session (BUG-014 fix)
  await signInTestUser(page);
  await page.goto('/workout/active');
});
```

**Changes:**
- Replaced stub comment with real session establishment
- Added import of `signInTestUser` helper
- Test now authenticates via app's login UI before navigating to /workout/active

## Proof block — Guardrails

```
[x] G-10 real uuids — user.id is now session.user.id (uuid v4 from Supabase auth.users)
[x] G-11 write paths keep await + retry — no changes to finishWorkout persist logic
[x] no localStorage auth fast-path — useSession is the only credential source (reads via getBrowserClient().auth.getSession())
[x] grep -rn "stub-user-id" src/ → 0 results
[x] tsc + eslint + vitest + Playwright e2e all green
```

## Verification

### Unit tests
```
npm run test:unit
 Test Files  18 passed (18)
      Tests  140 passed (140)
   Duration  1.14s
```

### TypeScript
```
npx tsc --noEmit
(clean — no output)
```

### Lint
```
npm run lint
✖ 17 problems (0 errors, 17 warnings)
(warnings pre-existing in other files)
```

### E2E test
```
npx playwright test tests/e2e/workout-straight-set.spec.ts
  1 passed (10.3s)
```

**E2E flow:**
1. Test user `e2e+workout@catalift.test` signs in via /login UI
2. Redirects to /today (successful auth)
3. Navigates to /workout/active
4. Workout auto-starts with real user.id
5. Adds exercise, logs set, completes, finishes
6. Workout saves to `workouts` table with `user_id` = real uuid
7. Redirects to /workout

### grep-guard
```
grep -rn "stub-user-id" src/
(no results — clean)
```

## Summary
Replaced hardcoded `'stub-user-id'` with real Supabase session from `useSession()` hook. E2E test now establishes real authenticated session via UI sign-in. Workout writes now use valid uuid, resolving BUG-014 (400 invalid input syntax). All tests green. No schema changes. No new dependencies.

## Next
Conductor opens PR from this branch. After merge, staging deployment will accept workout writes from authenticated users.
