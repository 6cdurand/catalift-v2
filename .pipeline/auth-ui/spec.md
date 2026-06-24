# spec.md — Auth / Onboarding UI port (Wave: auth-ui)

> Pipeline **Plan** stage output. Christo drops this into `catalift-v2/.pipeline/auth-ui/spec.md`.
> **Class B** (auth) → green LLM review is the FIRST gate, Christo signs off before merge (no auto-merge).
> **Model: Opus 4.8** (auth + security).
> Sources: `briefs/v2-auth-onboarding/REQUIREMENTS.md` (Christo's live-site feedback + port verdict),
> `plans/v2_guardrails.md`, the v1 source pinned below.

## Goal (one line)
Make v2's auth/onboarding LOOK AND FLOW like v1 — by porting v1's actual pages **verbatim** — changing
ONLY the data seam (Supabase Auth) and the 3 design tweaks Christo named. The current v2 auth screens
are generic placeholder scaffold; replace them with v1's real UI.

## THE METHOD — copy-paste, do not re-build (read this twice)
`apex-fitness` is PUBLIC. For each v1 file, **download it verbatim**, then change ONLY the seam lines
listed. Do NOT re-design, do NOT "improve", do NOT substitute generic shadcn layouts (that was the PR #2
miss). The v1 file IS the design.

Pinned commit: `fc7a340393c212e886e1942a9143a9a876fcd833`
Raw base: `https://raw.githubusercontent.com/6cdurand/apex-fitness/fc7a340393c212e886e1942a9143a9a876fcd833/`

```bash
# from catalift-v2 root — pull the v1 sources into a scratch reference dir (gitignored, do NOT commit)
mkdir -p .v1ref/auth .v1ref/invite .v1ref/onboarding
B="https://raw.githubusercontent.com/6cdurand/apex-fitness/fc7a340393c212e886e1942a9143a9a876fcd833"
curl -s "$B/src/app/page.tsx"                  -o .v1ref/root-page.tsx
curl -s "$B/src/app/auth/page.tsx"             -o .v1ref/auth/page.tsx
curl -s "$B/src/app/invite/page.tsx"           -o .v1ref/invite/page.tsx
# also pull whatever these import that is UI-only (CataliftLogo is being REMOVED — see design tweaks)
```
Then port the JSX/markup verbatim into the v2 files below, swapping only the seam.

## The 3 design tweaks (Christo, from the live site)
1. **Delete the chooser.** Root `/` must NOT show a "Log in / Sign up" choice screen. Root → `/login`.
2. **Header = the word "Catalift" only.** Remove `<CataliftLogo/>` (dumbbell icon) everywhere in the
   auth shell; render plain text "Catalift". No "FITNESS", no logo, no brand lockup.
3. **Use v1's BLUE.** Port v1's `sky-*` / `slate-900/950` palette verbatim (it comes free with the
   copy-paste). Do not keep v2's current black scheme.

## File-by-file (PORT / REBUILD / DROP + the EXACT seam change)

### 1. `src/app/page.tsx` (root) — REBUILD the redirect only
- v1 reads `apex-auth` from localStorage + runs `catalift-*→apex-*` migration + seed clearing. **DROP all
  of that** (dead in v2; `apex-`/localStorage-auth are G-02/G-03 footguns the grep-guard rejects).
- New: a server component that checks the Supabase session via `@/lib/supabase-server` →
  `redirect('/today')` if a session exists, else `redirect('/login')`. Keep it minimal; no client spinner
  needed if it's a server redirect.
- **Net effect: the chooser is gone.**

### 2. `src/app/(auth)/login/page.tsx` — PORT v1 login UI verbatim, swap seam
- Take the **login tab** markup + the **forgot-password modal** from v1 `auth/page.tsx` verbatim
  (fields, labels, sky styling, the "contact your trainer" help text).
- SEAM: replace `useAuthStore().login(email, password)` (localStorage + `hashPassword`) with
  `getBrowserClient().auth.signInWithPassword({ email, password })`. On success → `router.push('/today')`
  (or `/onboarding/client` if profile incomplete, matching v1's branch).
- KEEP the forgot-password flow AS-IS: v1 already calls
  `supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/update-password` })` — copy verbatim
  (just retarget redirect to v2's `(auth)/update-password`). This is enumeration-safe; keep the neutral
  confirmation message.
- DESIGN: header text "Catalift", no logo.

### 3. `src/app/(auth)/signup/page.tsx` — PORT v1 4-step register wizard verbatim, swap seam
- Take v1's **register tab** = the 4-step wizard (`credentials → profile → goals → connections`) verbatim,
  including the step state machine, all fields (email, username, password, displayName, gender, DOB,
  height, weight, isTrainer switch), and the connections step (Apple/Google Health, Calendar, Stripe-if-trainer).
- SEAM: replace `useAuthStore().register(...)` with:
  1. `getBrowserClient().auth.signUp({ email, password, options: { data: { mode: role }, emailRedirectTo: `${origin}/callback` } })`
  2. on returned session, write the profile row to `public.users` (id = auth.uid()) with the wizard fields —
     reuse v2's existing `syncUserModeToProfile` pattern, extended to also persist displayName/gender/DOB/
     height/weight. **No `hashPassword`, no `apex-users` write.**
- **G-20 ROLE AUTHORITY (required, not optional):** `public.users.role` is the source of truth. Writing
  `mode` into `user_metadata` for convenience is OK, but anything that GATES trainer features must read
  role from `public.users.role`, never from `user_metadata`. Update `_shell-stubs.ts` `useAuthStore` to read
  role from the profile row (a `users` SELECT), not `user.user_metadata.mode`. (Kills the self-promotion gap.)

### 4. `src/app/(auth)/reset-password` + `update-password` + `callback` — PORT verbatim
- v1's `auth/reset-password`, `auth/update-password`, `auth/callback` are already Supabase-native. Port
  the UI verbatim; confirm no localStorage seam remains. `update-password` calls
  `supabase.auth.updateUser({ password })` on the recovery session.

### 5. `src/app/invite/page.tsx` — PORT v1 invite UI verbatim, swap seam
- Port the "verifying your invitation" UI verbatim (the blue gradient header from Christo's screenshot,
  minus the dumbbell logo + "FITNESS" → just "Catalift").
- SEAM: replace `checkInvitationByToken` / `acceptInvitation` / `updateUserInSupabase` (`@/lib/supabaseSync`)
  with v2 equivalents that verify a single-use, token-scoped invite and create the `trainer_clients` link
  using `users.id = auth.uid()`. Keep the security gate v1 added (Sev-0 2026-05-04): setup-password flow
  opens ONLY for a server-verified valid token — never on a bare `?email=` param.

### 6. `src/app/onboarding/client/` — PORT verbatim, swap profile write
- Port the client onboarding UI verbatim; the only seam is the profile write → `public.users` (id=auth.uid()).

## Resend email (Christo: "make sure this is part of the plan")
Two roles — **(B) is a separate follow-on dispatch; (A) is a Christo Class-B config step, NOT code:**
- **(A) Supabase Auth custom SMTP → Resend** (so confirm + password-reset emails deliver past Supabase's
  rate-limited default). Christo sets this in the Supabase dashboard (Auth → SMTP); secret `RESEND_API_KEY`
  in the SMTP password field. NO code in this wave — but the forgot-password flow above depends on it to
  actually send. Note in PR description that emails won't deliver until SMTP is configured.
- **(B) Trainer-invite emails via a Supabase Edge Function calling the Resend API** — mirrors v1's branded
  invite. **Defer to its own sub-spec** (`briefs/v2-auth-onboarding/spec-invite-email.md`, to author next);
  it's Class B (edge function + secret) and shouldn't block the UI port.

## Guardrails (copy into acceptance criteria)
```
[ ] G-19 PORTED v1 auth/invite/onboarding UI VERBATIM — only the named data seams changed; no generic rebuild ★
[ ] G-02 no password_hash / hashPassword / localStorage auth fast-path introduced
[ ] G-03 no apex-* / catalift-* localStorage auth keys; auth token never hand-managed
[ ] G-01 identity: profile reads/writes use users.id = auth.uid() directly
[ ] G-18 root + authed routes survive hard-nav/refresh; root redirect is server-side; no /auth bounce when signed in ★
[ ] G-20 role authority read from public.users.role, NOT user_metadata.mode (signup + _shell-stubs.ts)
[ ] G-25 keep v1's invite security gate (token server-verified; never opens setup on bare ?email=)
[ ] design: chooser deleted (root → /login); header = "Catalift" text, no logo; v1 blue palette
[ ] no-legacy-auth grep-guard passes; tsc + lint + unit + e2e all green ★
[ ] .v1ref/ scratch dir is gitignored and NOT committed
```

## Tests
- e2e: root `/` while signed-out → lands on `/login` (no chooser). While signed-in → `/today`, survives hard refresh.
- e2e: signup wizard completes all 4 steps → account created → profile row in `public.users` with role.
- e2e: login with good creds → `/today`; bad creds → error toast, no crash.
- e2e: forgot-password → neutral confirmation shown (no enumeration); (delivery verified manually once SMTP set).
- unit: role resolves from `public.users.role`, NOT `user_metadata` (G-20 regression test — a metadata-only
  role must NOT grant trainer access).
- e2e: `/invite?token=<valid>` opens setup; `/login?email=x` does NOT open setup (security gate).

## Out of scope (do not expand)
- The Resend invite Edge Function (separate sub-spec B).
- Any feature page beyond auth/onboarding (workout/programs/results come in their own waves).
- Strength rating, methodology spine, payments — not this wave.

---

## EXECUTION NOTE — SCOPE OVERRIDE: Option B, no migration this PR (Christo, 2026-06-24)

Live v2 `public.users` has only `id, email, full_name, role, avatar_url, date_of_birth`. There is NO
`username/display_name/gender/height/weight` column and NO `invitations` table. Therefore:

- Port ALL v1 UI verbatim — login, the full 4-step wizard, forgot-password, reset/update, invite,
  onboarding/client. Look + flow identical.
- Wire seams ONLY to existing columns: `full_name`, `role`, `date_of_birth`, `email`.
- The wizard still RENDERS gender/height/weight/username (visual parity) but persistence of those
  fields is stubbed: `// TODO(auth-schema-followon)`. Do NOT invent columns. Do NOT create tables.
- `/invite` renders verbatim but its accept path is feature-flagged OFF (`FEATURE_FLAGS.invites`)
  until the `invitations` table lands. No fake table, no localStorage fallback (G-02/G-03).
- No migration in this PR. New columns + the `invitations` table come in a separate Class-B migration spec.
- Keep the G-20 role fix: read role from `public.users.role`, not `user_metadata`.
