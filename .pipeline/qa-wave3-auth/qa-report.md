# QA Wave 3 — Critical-path AUTH smoke (staging)

- **Target:** https://catalift-v2.netlify.app (staging only — prod/v1 untouched)
- **Repo / branch:** `6cdurand/catalift-v2` @ `main` (base commit `64adf67`)
- **Date (UTC):** 2026-06-26
- **Supabase project (observed from network):** `https://igagmdkdzjkxrwnyvgqk.supabase.co`
- **Method:** real browser session. Network evidence captured via a `window.fetch` interceptor installed in the page before driving the actual UI; console read from the live page.

## Result summary

| Step | Scenario | Result |
|------|----------|--------|
| 1 | Site loads, no white screen, console clean | **PASS** |
| 2 | Sign up new test client, land in client shell | **FAIL** (signup blocked server-side) |
| 3 | Log out / log back in, session persists | **BLOCKED** (no account from Step 2) |
| 4 | Hard-refresh deep authed route, no `/login` bounce, no white screen (G-18) | **BLOCKED** for the "while logged in" precondition; see supplementary finding below |

---

## Step 1 — Site loads, console clean → PASS

Loaded `https://catalift-v2.netlify.app/`. The root performs a **server-side redirect to `/login`** and renders the sign-in form. No white screen.

- Final URL: `https://catalift-v2.netlify.app/login`
- Console output on load: **empty** (no errors, no warnings)
- `document.cookie`: `(none)` · `localStorage` keys: `[]` (no session, as expected for a fresh visit)

![Step 1 — root redirects to /login, form renders, no white screen](https://app.devin.ai/attachments/55904699-29ce-4beb-aa0c-d456aacdf2f2/ss_62230342.png)

---

## Step 2 — Sign up new test client → FAIL

Drove the full multi-step signup UI (`/signup`) as a **client** (Personal Trainer toggle left OFF):

1. Account: `qa+1782466200@catalift.test` / username `qatest200` / password set + confirmed
2. About You: display name, gender, DOB, height, weight
3. Your Path: client (trainer toggle off)
4. Connect Your Data: skipped → clicked **Create Account**

The submit button showed `Creating…` then reverted to `Create Account`; the app did **not** advance to the client shell.

![Step 2 — signup form, step 1 of the wizard](https://app.devin.ai/attachments/d7de10e3-0eaf-49dd-aa19-66b084cc1332/ss_60555831.png)

![Step 2 — final wizard step; submit reverted, no navigation to client shell](https://app.devin.ai/attachments/08234d0b-ad84-4a92-989b-1535089efcfe/ss_d2357d84.png)

### Real network evidence (captured from the live UI signup)

```
POST https://igagmdkdzjkxrwnyvgqk.supabase.co/auth/v1/signup?redirect_to=https%3A%2F%2Fcatalift-v2.netlify.app%2Fcallback
→ HTTP 429
→ {"code":"over_email_send_rate_limit","message":"email rate limit exceeded"}
```

### Root cause

The Supabase auth endpoint returns **HTTP 429 `over_email_send_rate_limit`** — the project's confirmation-email send quota is exhausted. Combined with email confirmation being required (`mailer_autoconfirm = false`, observed earlier at `/auth/v1/settings`), **no new account can be created or confirmed** on staging right now. This is an environment/config blocker, not a UI bug — but it makes the client-signup critical path non-functional on staging.

> Note: a direct API probe of `.test`-domain emails also returned `400 email_address_invalid`; valid-TLD domains returned the same `429` rate-limit. Either way the signup path terminates before an account exists.

---

## Step 3 — Log out / log back in → BLOCKED

Cannot be executed: Step 2 never produced a usable account. A login attempt with the intended credentials returns "Invalid email or password" (expected — the account does not exist), confirming the account was never created.

![Step 3 — login with the never-created credentials → "Invalid email or password"](https://app.devin.ai/attachments/1be0a37d-830d-4398-91ec-c571f92c2e98/ss_65c0906d.png)

---

## Step 4 — Hard-refresh deep authed route (G-18) → BLOCKED (precondition) + supplementary finding

The requested test requires being **logged in** first, which is impossible due to the Step 2 blocker, so the "authed route survives hard-nav while logged in" assertion **could not be executed**.

**Supplementary finding (unauthenticated hard-load).** I hard-navigated directly to the deep route `/today` with **no session present**:

- `document.cookie`: `(none)` · `localStorage` keys: `[]` (verified no session)
- Page rendered fully: header "Today / Your daily training" + placeholder body "This screen will land in a future lane."
- **No white screen** ✓
- **No bounce to `/login`** — the protected route rendered to an anonymous visitor
- Console output: **empty**

![Step 4 — /today hard-loaded with no session: renders, no /login bounce](https://app.devin.ai/attachments/53e37db1-49c6-439f-b3fb-9b2623bfcaef/ss_e11c10be.png)

This is a **gating concern relevant to G-18**: while there is no white screen on hard-refresh (the "no white screen" half of G-18 holds), the `(app)` routes do **not** enforce a server-side session gate — an unauthenticated hard-load of `/today` renders protected UI instead of redirecting to `/login`. Only the root route (`/`) performs a server-side session redirect; the `(app)` group does not. The intended "authed-only, survives hard-nav" behavior could not be positively confirmed because no session could be established.

---

## Verdict

- **1 PASS, 1 FAIL, 2 BLOCKED.**
- Hard blocker for the auth critical path: **Supabase email send rate limit (`429 over_email_send_rate_limit`)** with `mailer_autoconfirm=false` → new client signup is non-functional on staging.
- Separate observation for follow-up: `(app)` deep routes render without an auth gate when unauthenticated (no `/login` bounce).

No fixes were made (report-only, per task scope).
