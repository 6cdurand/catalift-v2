# QA — Wave 3 (auth-only smoke), deployed staging

- **Target:** https://catalift-v2.netlify.app (deployed staging)
- **Date:** 2026-06-29 (UTC)
- **Branch under test:** `main` @ `a9a8d9d`
- **Role:** verifier-agent / QA (read-observe). No fixes applied.
- **Scope:** FIRST RUN — auth-only critical-path smoke (Wave 3). Workout (w2a) + Programs (w1)
  not yet merged, so Part A full walkthrough and Part B v1↔v2 parity are out of scope this run.
- **Test account (self-created, v2 staging):** `qa+20260629002100@catalift.test` (client). Throwaway;
  no real-user creds, no prod, no v1.

> **VERIFY-don't-claim note:** every PASS/FAIL below is backed by real evidence captured live —
> console output (via DevTools console), the session auth cookie name, the live URL after each
> action, and screenshots. A screen recording of the full run is attached to the QA session.

---

## Part A — auth smoke (5 scoped steps)

| # | Step | Verdict | Evidence |
|---|------|---------|----------|
| 1 | Open staging URL; confirm it loads (no white screen); capture console | **PASS** | Branded Catalift auth card renders (sky→orange gradient, Sign In / Create Account tabs, "Welcome Back"). `/` → 307 redirect → `/login` (HTTP 200). Console **clean** (no logs/errors). |
| 2 | Sign up a NEW client; confirm landing in client shell | **PASS** | 4-step wizard (credentials → About You → Your Path → Connect Your Data) → "Create Account" → landed on `/today` with the **client** bottom nav (Today / Feed / Community / Program / Profile). Console clean. Session cookie `sb-igagmdkdzjkxrwnyvgqk-auth-token` set. |
| 3 | Log out, log back in; confirm session persists | **PASS** (login) / see Issue #2 (no UI logout) | Logged out by expiring the auth cookie (no UI logout button exists yet — see Issue #2). Logged back in via `/login` with the same creds → `signInWithPassword` → landed `/today`, client nav restored, cookie re-set. Console clean. |
| 4 | While logged in, HARD REFRESH a deep authed route; confirm NO `/login` bounce, NO white screen (G-18) | **PASS** | Navigated to `/program`, then `Ctrl+Shift+R`. Stayed on `/program` (no bounce), nav intact (Program active), content rendered (no white screen). Console clean. **G-18 holds for authenticated users.** |

### Evidence — screenshots

**Step 1 — staging loads, branded auth card, console clean**

![staging login loads](https://app.devin.ai/attachments/a8ecc0c2-0d26-4970-a98a-11a4cbc2f657/ss_9c900f43.png)

**Step 2 — signup landed in the client shell (`/today`)**

![signup lands on /today client shell](https://app.devin.ai/attachments/3fc3370f-29d0-4c26-b099-87c04c0b1ea4/ss_b7eb8d07.png)

**Step 3 — re-login restored the session (`/today`, client nav)**

![re-login restored session](https://app.devin.ai/attachments/9b10d50a-95ff-43ee-9a6f-fc27c9c3757f/ss_0400a9e4.png)

**Step 4 — hard refresh on `/program` stayed authed (G-18)**

![hard refresh on /program stays authed](https://app.devin.ai/attachments/794fd893-d714-473a-bcfa-e2b30688872d/ss_5e965849.png)

### Console / network evidence (captured live)
- Console output on initial load, after signup, after login, and after hard refresh: **empty** (no
  errors, warnings, or failed-request logs).
- `localStorage` keys after auth: **none** — the session lives in the `@supabase/ssr` cookie
  `sb-igagmdkdzjkxrwnyvgqk-auth-token` (not a localStorage fast-path). Consistent with guardrails
  **G-02** (no localStorage auth fast-path) and **G-03** (token not in evictable localStorage), and
  is *why* G-18 hard-refresh persistence works.
- No failed network requests surfaced in console during any step; signup/login both resulted in a
  set auth cookie and a client-side route change to `/today`.
- Sentry: **not checked** (no QA access to the Sentry project this run).

---

## Issues found (prioritized)

### Issue #1 — No auth guard on `(app)` routes (logged-out users are NOT redirected to `/login`) — **Class B (auth) · SEV-2**
**STOP-and-report (auth). Not patched.**

While logged OUT (auth cookie cleared), directly navigating to an authed route renders the page
content instead of redirecting to `/login`. The bottom nav is hidden, but the route does not bounce.

- Reproduced on `/profile` and `/today` (URL stays on the authed path; "This screen will land in a
  future lane." renders).

![logged-out /profile renders, no redirect](https://app.devin.ai/attachments/82d5cd56-f17e-4693-abd1-0a56b3809e8b/ss_3b44c27f.png)

**Root cause (read-only, in repo):** the app shell has no auth guard. `src/app/(app)/layout.tsx`
renders `MainLayout` with no session gate, and `src/components/layouts/MainLayout.tsx` does:

```tsx
const { user, isAuthenticated } = useAuthStore(); // from ./_shell-stubs (wraps useSession)
...
if (!isAuthenticated) { return <>{children}</>; }  // renders the page WITHOUT nav — no redirect
```

So an unauthenticated visitor sees the page (sans nav) rather than being sent to `/login`. The
spec's `useRequireAuth` guard (`src/features/auth/hooks/use-require-auth.ts`) exists but is **not
wired** into the `(app)` layout.

**Why this matters / why it's a false-green risk:** Step 4 (G-18 "no bounce on hard refresh")
*passes*, but partly because there is no guard to bounce *anyone*. The authed-user case is genuinely
correct (session persists via the SSR cookie), but the missing guard means the inverse protection is
absent. Today the exposure is low — `(app)` pages are placeholders with no real data — but this MUST
be fixed (wire `useRequireAuth` / a layout gate) before any feature lane ships real authed data, or
it becomes a data-exposure regression.

**Class:** auth → **Class B**. Per spec/TRUST_MODEL: do not patch blindly — Christo sign-off. No fix
PR opened.

### Issue #2 — No UI affordance to log out — **Class A · SEV-3 (minor / expected-WIP)**
There is no logout button anywhere in the deployed shell. `logout()` exists
(`src/features/auth/api/logout.ts`, exported from `src/features/auth/index.ts`) but is not invoked by
any component; `/profile` is still a "future lane" placeholder. Logout could only be exercised by
expiring the session cookie. Expected given Profile isn't built yet — flagging so it isn't lost when
the profile/settings lane lands.

---

## Part B — v1↔v2 parity
**Not run this wave.** Rubric docs (`plans/v1_to_v2_reuse_map.md`, `plans/v2_guardrails.md`, per-box
`bugs.md`) are command-center artifacts not present in this repo, and the ported feature surface
(Programs/Workout) is not yet merged. Defer to the first feature-wave merge.

**One scope observation (informational, NOT flagged as a defect):** the deployed signup still renders
the full 4-step v1 wizard (credentials → profile → goals → connections) even though Wave-3 spec
"Option A" locked signup to credentials + role toggle only. This matches the shipped code's intent —
`src/app/(auth)/signup/page.tsx` collects the extra fields for visual parity but only persists
`full_name` / `role` / `date_of_birth` (see its `TODO(auth-schema-followon)`). Calling out for
command-center to confirm it's the intended interim divergence.

---

## Summary
- **Scoped auth smoke (4 steps): PASS.** Load, signup→client shell, logout→re-login, and
  hard-refresh-stays-authed (G-18) all verified with clean console.
- **1 Class B auth issue (SEV-2):** no auth guard on `(app)` routes → STOP-and-report, no fix.
- **1 Class A issue (SEV-3):** no UI logout yet (expected WIP).
- No fixes applied. No prod/v1 touched. Test account is a throwaway on v2 staging.
