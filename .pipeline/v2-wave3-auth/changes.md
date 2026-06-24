# .pipeline/v2-wave3-auth/changes.md — Stage 2 (CODE)

> Coder artifact for Wave 3. Class B (security). Branch: `wave3-auth` (from `main`).
> Scope: Option (A) minimal-auth-now — email + password + role only.

## Summary

Ported v1's branded auth look (`CataliftLogo`, sky gradient, sky-500 active Login/Register tabs)
onto v2's **existing** Supabase Auth backend. Login/signup now use the v2 `getBrowserClient().auth.*`
seams; signup collects a **role toggle** (client/trainer) that sets `user.mode`. Added the
forgot-password and update-password recovery screens on `supabase.auth.resetPasswordForEmail` /
`updateUser`. No schema change (per scope lock). The v1 anti-patterns (`hashPassword`, `apex-users`,
`localStorage.clear`, `@/lib/store`) were not ported and are now blocked by a CI grep-guard test.

## Files Added

- `src/features/auth/components/AuthShell.tsx` — branded card wrapper: sky gradient backdrop,
  `CataliftLogo`, and a Login/Register tab toggle (sky-500 active) that routes between `/login`
  and `/signup`. (G-19: ports v1 visuals; only the data layer is rebuilt.)
- `src/features/auth/api/user-mode.ts` — `readUserMode()` (resolves role from auth metadata) and
  `syncUserModeToProfile()` (mirrors `user_metadata.mode` → `public.users.role` with **await +
  retry + backoff**; G-11). No fire-and-forget.
- `src/app/(auth)/reset-password/page.tsx` — forgot-password screen → `resetPasswordForEmail`.
  Shows a **neutral confirmation** regardless of result (no account enumeration).
- `src/app/(auth)/update-password/page.tsx` — set-new-password screen → `auth.updateUser`
  (reached via the recovery link; session established by `detectSessionInUrl`).
- `src/features/auth/__tests__/user-mode.test.ts` — unit: `readUserMode` mapping + retry-then-success
  + throw-after-retries for `syncUserModeToProfile`.
- `src/features/auth/__tests__/no-legacy-auth.test.ts` — **grep-guard**: fails if `hashPassword`,
  `apex-users`, `localStorage.clear`, or `@/lib/store` appears in `src/` (excludes `__tests__`).
- `tests/e2e/auth.spec.ts` — e2e: tab navigation between login/register, role toggle `aria-checked`,
  forgot-password neutral confirmation (Supabase recover endpoint mocked for determinism).

## Files Modified

- `src/app/(auth)/login/page.tsx` — rebuilt on `AuthShell`; "Welcome back" card; "Forgot password?"
  link; still `signInWithPassword`. On success, best-effort `syncUserModeToProfile` reconcile
  (non-blocking — metadata is the source of truth), then `router.push("/")` + `refresh()`.
- `src/app/(auth)/signup/page.tsx` — rebuilt on `AuthShell`; added client/trainer role toggle
  (sky for client, rose for trainer); `signUp({ options: { data: { mode }, emailRedirectTo } })`;
  mirrors role on confirmation-off sessions; "check your email" state otherwise.
- `src/features/auth/index.ts` — barrel now also exports `readUserMode`, `syncUserModeToProfile`,
  `AuthShell`, and the `UserRole` / `CataliftUser` types.
- `tests/e2e/smoke.spec.ts` — updated the `/login` and `/signup` assertions to the rebranded UI
  (Login/Register tabs, "Welcome back" / "Create your account" headings, role radios). Deliberate
  test fix — homepage test unchanged. (QA lane rule 4: documented, not weakened.)

## Reuse-map outcome (PORT / REBUILD / DROP)

- **PORT** ✅ branded card, logo, sky-500 tabs, login layout, register-as-credentials + role toggle,
  forgot/reset/update-password UI.
- **REBUILD** ✅ all auth calls on the existing v2 seam (`getBrowserClient().auth.*`); reused
  `useSession` / `useRequireAuth` / `logout` untouched. Role write is a scoped `public.users`
  update (await + retry), not a god-file call.
- **DROP** 🚫 `hashPassword`, `apex-users` localStorage fast-path, `localStorage.clear()`,
  `@/lib/store` (`useAuthStore`/`useTrainerStore`), placeholder-account path, `updateUserInSupabase`.
  None ported; grep-guard enforces it.

## Schema touched?

**N** — no migration. `public.users.role` already exists (00001); `user_metadata.mode` is set via
`signUp` options. No `users` columns added (scope lock honored).

## Follow-up fix (hydration-race)

`AuthShell.tsx` originally navigated tabs with `useRouter` + `onValueChange`, making the toggle a
client-only control (server/client tree divergence → hydration-race flake, brittle hard-nav).
Replaced with **`<Link>`-backed tabs** (`TabsTrigger asChild` wrapping Next `<Link>`), keeping
`value={active}` for the sky-500 active styling. Removed `useRouter`/`onValueChange`. Navigation is
now a real server-rendered anchor (G-18/G-19). No Tailwind/layout changes. Auth + smoke e2e now
pass even under full parallel workers (previously timed out).

## Follow-up fix 2 — widened v1-footgun guard + sweep

### Guard widened

`no-legacy-auth.test.ts` `FORBIDDEN` array expanded from 4 patterns to the full v1-footgun set:

| Pattern | Category | Guardrail |
|---|---|---|
| `hashPassword` | auth credential footgun | G-02 |
| `password_hash` | auth credential footgun | G-02 |
| `apex-` | unscoped localStorage key prefix (apex-users, apex-workouts, …) | G-03, INC-003 |
| `localStorage.clear` | auth token eviction | G-03, INC-003 |
| `@/lib/store` | v1 Zustand god-store | G-16 |
| `canonical_user_id` | v1 identity divergence | G-01 |
| `fetchAllUsersFromSupabase` | v1 god-file user fetch (PII disclosure, BUG-N3) | G-01 |
| `updateUserInSupabase` | v1 god-file user write | G-01 |

Scan logic, `__tests__` exclusion, and file-collection code unchanged.

### Offender enumeration

`npm run test:unit` → **29 passed (6 files)**, including `no-legacy-auth.test.ts` (9 patterns, 0 offenders).

**Zero offenders found in app/feature source.** The spec anticipated `apex-users` in `src/lib/exercises.ts` (leaked by Wave 2 PR #6), but the Wave 2 pure-logic files have not yet merged to `main` — `wave3-auth` branches from `main` (08b684c) and does not contain those 24 ported files. The widened guard will catch them when Wave 2 merges into a branch that includes this guard.

### Identity/auth patterns

No `canonical_user_id`, `fetchAllUsersFromSupabase`, or `updateUserInSupabase` matches found — nothing to escalate to Christo.

## Deviations from spec

- **`api/invite.ts` deferred** (the one acceptance item not delivered). No `invitations` table exists
  in `supabase/migrations/` or the live DB, and Option (A) explicitly forbids schema changes. Per
  Christo's call (2026-06-23), the invite-by-token flow ships with the connections/onboarding spec
  that introduces the table. The `invite.test.ts` unit listed for the Tester stage is deferred with it.
- Login/register remain **separate routes** (`/login`, `/signup`) rather than one in-page Tabs panel,
  matching v2's existing route structure; the Tabs toggle navigates between them (v1 look preserved).

## Proof

```
# tsc
$ npx tsc --noEmit         → clean (exit 0)

# lint (incl. import-boundary check)
$ npm run lint             → clean (exit 0)

# unit
$ npm run test:unit        → Test Files 6 passed (6) · Tests 25 passed (25)

# e2e (run as CI does: single worker)
$ npx playwright test --workers=1   → 7 passed

# grep proof — forbidden v1 patterns in app/feature source (non-test):
$ grep -rn -E "hashPassword|apex-users|localStorage\.clear|@/lib/store" src --include=*.ts --include=*.tsx | grep -v __tests__
  → (no matches)

# new symbols mounted:
$ grep -rn "AuthShell" src/app/(auth)        → login, signup, reset-password, update-password
$ grep -rn "signInWithPassword\|signUp\|resetPasswordForEmail\|updateUser" src/app/(auth)  → present
```

> Note on e2e workers: `playwright.config.ts` uses `workers: 1` under CI and many workers locally.
> Under many local workers the single `next dev` server intermittently times out soft navigations
> (affects the pre-existing `shell.spec.ts` too); all 7 pass in isolation and with `--workers=1`
> (the CI path, which also has `retries: 2`).
