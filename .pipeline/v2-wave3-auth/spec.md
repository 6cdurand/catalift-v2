# .pipeline/v2-wave3-auth/spec.md — Stage 1 (PLAN)

> **First run of the pipeline model** (`plans/v2_pipeline_model.md`). This IS the Planner artifact.
> Authored by command-center (Opus 4.8) because it pastes v1 source the v2 executor can't read.
> **Place at `catalift-v2/.pipeline/v2-wave3-auth/spec.md`.** Coder → `changes.md`, Tester →
> `tests.md`, Reviewer → `review.md` (read-only) live alongside it.

**Class:** **B (security)** — auth. Per `TRUST_MODEL.md`: a green read-only review is the FIRST
gate; **Christo signs off before merge.** No auto-merge.
**Executor model for ALL stages:** **Opus 4.8** (auth = creation + security; never GLM here).
**Repo:** catalift-v2 · **Branch from:** main · open a PR; do NOT push main, deploy, or pick next.

---

## ✅ SCOPE LOCKED — Option (A) Minimal-auth-now (Christo, 2026-06-23)

Signup collects **email + password + role (`mode`) ONLY**. Profile fields (displayName, gender,
dateOfBirth, height, weight) are **OUT of scope** — they move to a later `/onboarding` port
(separate spec). **No schema change is required for this port.** The coder must NOT add `users`
columns and must NOT collect profile data on the signup form. The register flow keeps ONLY the
`credentials` step + the role toggle; the `profile → goals → connections` steps are deferred.

---

## The reuse-map verdict (PORT / REBUILD / DROP) — the heart of this spec

This is **NOT a verbatim port** (unlike the shell). v1 `auth/page.tsx` (1081 lines) is riddled with
the exact patterns our guardrails forbid. Tag every piece:

### ✅ PORT (visual + UX — copy the look/flow onto v2's backend)
- The **branded auth card**: `CataliftLogo`, sky-gradient, `Tabs` login/register with sky-500 active
  state (v1 lines 488-505). (CataliftLogo + Tabs already in v2 from PR #5.)
- **Login form** layout: email + password, "Welcome Back" card (v1 lines 505-622).
- **Register tab** layout + the **multi-step flow** UX: `credentials → profile → goals → connections`
  step machine with Back/Next (v1 `step` state, lines 39/302-313/653). Under option (A), keep ONLY
  the `credentials` step + a role toggle; the profile/goals/connections steps move to onboarding.
- **Role toggle** (client vs trainer) → sets `user.mode` (v1 `isTrainer`, line 105).
- **Forgot-password** + **reset/update-password** screens (v1 `auth/reset-password/page.tsx` 293L,
  `update-password/page.tsx` 247L) — port the UI; rewire to `supabase.auth.resetPasswordForEmail` +
  `updateUser`.

### 🔧 REBUILD (logic — on v2's EXISTING backend, already scaffolded)
- ALL auth calls use the **existing** v2 seam — do NOT invent new:
  - `getBrowserClient().auth.signInWithPassword` (v2 login page already does this).
  - `.auth.signUp` for register; on success set `user.mode` via the v2 user record.
  - `.auth.resetPasswordForEmail` / `.auth.updateUser` for recovery.
  - `useSession()` + `useRequireAuth()` + `logout.ts` **already exist** (`src/features/auth/hooks|api`).
    Reuse them; the login page must route via them, not a bespoke guard.
- **Invite acceptance:** v1 used `acceptInvitation`/`checkInvitationByToken` from the 156KB
  `supabaseSync` god-file. **Rebuild as a small typed `src/features/auth/api/invite.ts`** that
  reads the invite by token + links the new user — await + retry (G-11), no god-file.

### 🚫 DROP (do NOT bring across — these ARE the v1 bugs)
- `hashPassword` + `password` column writes (v1 lines 5, 143) — **G-02**. Supabase Auth only.
- `localStorage.getItem/setItem('apex-users')` fast-path (v1 lines 132-145) — **G-02/G-03**.
- `localStorage.clear()` (v1 line 612) — **would evict the `sb-*` auth token → INC-003 outage.** Never.
- `useAuthStore`, `useTrainerStore` from `@/lib/store` (v1 line 5) — use v2 `useSession`.
- The "placeholder account → set up password" path (v1 lines 143-183) — v1 migration shim; greenfield
  v2 has no placeholders. DROP unless invite flow genuinely needs it (it shouldn't).
- `updateUserInSupabase` from supabaseSync — use a scoped v2 write.

---

## v2 backend you MUST reuse (already built — read these, don't rebuild)
- `src/app/(auth)/login/page.tsx` — working `signInWithPassword`; restyle to v1's branded card.
- `src/app/(auth)/signup/page.tsx` + `callback/route.ts` — exist; restyle + wire role.
- `src/features/auth/hooks/use-session.ts` — `{user, loading}`, `onAuthStateChange`, clears
  `catalift-*` keys on `SIGNED_OUT` (already correct — do not touch the clear logic).
- `src/features/auth/hooks/use-require-auth.ts` — redirect guard.
- `src/features/auth/api/logout.ts`, `src/features/auth/types.ts` (`CataliftUser.mode`).

> v1 import lines to paste-verify for the coder (so it knows what to STRIP):
> ```
> 5:  import { useAuthStore, useTrainerStore, hashPassword } from '@/lib/store';   // DROP all 3
> 17: import { supabase } from '@/lib/supabase';                                    // → getBrowserClient()
> 18: import { acceptInvitation, checkInvitationByToken, updateUserInSupabase } from '@/lib/supabaseSync'; // REBUILD as invite.ts
> 132-145: localStorage 'apex-users' + hashPassword write                          // DROP
> 612: localStorage.clear()                                                          // DROP (token-evict)
> ```

---

## Guardrails (paste into proof block — these apply)
```
[ ] G-01 identity: reads+writes use auth.uid()/users.id directly — no canonical_user_id layer
[ ] G-02 auth: NO password_hash / NO localStorage auth fast-path introduced ★
[ ] G-03 storage: auth token never evicted; no localStorage.clear(); bulky caches → IndexedDB ★
[ ] G-04 cold-start session gate + retry before first authed fetch (native/WebView) ★
[ ] G-08 login/critical reads are direct self-reads — not a not-yet-deployed RPC
[ ] G-18 authed routes survive hard-nav/refresh; no /auth bounce (uses @supabase/ssr) ★
[ ] G-16 separate store per resource; no state-overwrite
[ ] G-19 PORTED v1 visuals verbatim; only the data layer rebuilt; no generic redesign ★
[ ] tsc + lint + unit + e2e all green ★
```

## Acceptance criteria
- [ ] Login/signup render v1's branded look (CataliftLogo, sky-gradient, sky-500 active tabs).
- [ ] Login via `signInWithPassword` → lands authed; hard-refresh on a deep route stays (G-18).
- [ ] Signup via `signUp` (+ role → `user.mode`); confirm/callback works, no blank screen.
- [ ] Forgot/reset/update-password flows work on `supabase.auth.*`.
- [ ] Invite-by-token accepted via new `api/invite.ts` (await+retry), no supabaseSync.
- [ ] grep proof: NO `hashPassword`, NO `apex-users`, NO `localStorage.clear`, NO `@/lib/store`.
- [ ] All gates green.

## Tests the Tester stage must write (→ `tests.md`)
- e2e `auth.spec.ts`: signup → confirm → login → hard-refresh deep route stays authed (G-18) →
  logout clears session. + forgot-password request shows neutral confirmation.
- unit `invite.test.ts`: valid token links user; invalid/expired token errors gracefully; write
  retries on transient failure then surfaces error (G-11).
- grep-guard assertion (unit or CI step): fails if `hashPassword|apex-users|localStorage.clear` appears.

---

## Stage hand-off checklist (this pipeline run)
- [x] **Stage 1 PLAN** — this file; scope locked to (A). Christo: paste into `catalift-v2/.pipeline/v2-wave3-auth/spec.md`.
- [ ] **Stage 2 CODE** (Opus 4.8) — implement; fill `changes.md`; open PR.
- [ ] **Stage 3 TEST** (Opus 4.8) — write listed tests; run gates; fill `tests.md` with real output.
- [ ] **Stage 4 REVIEW** (fresh Cascade, read-only) — `review-pr` skill vs this spec + guardrails → `review.md`.
- [ ] **Christo sign-off** (Class B) → merge → I update `PLAN_v2_build.md` port log.
