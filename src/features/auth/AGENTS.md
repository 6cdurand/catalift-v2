# Auth Feature Rules

> Applies when working in `src/features/auth/`.

## What this feature owns

- Supabase Auth session management (login, signup, logout, session persistence)
- Auth UI (login page, signup page, auth callback)
- Auth hooks (use-session, use-require-auth)

## Standing rules

1. **Supabase Auth only.** No custom `password_hash` column. No legacy login paths. Use `@supabase/ssr` for session management.

2. **Session persistence.** Use `@supabase/ssr` cookie-based sessions. Configure for long-lived persistence (not default short sessions). This fixes the v1 "app doesn't stay signed in" bug.

3. **Logout must clean up everything.** On logout: clear Supabase session, clear all user-scoped localStorage keys (use `userScopedKey()` pattern), clear Zustand persisted stores, redirect to `/login`.

4. **No unscoped caches.** v1 had `apex-user-profile-cache` and `apex-users` as unscoped global keys that leaked across accounts. All caches must be user-scoped.

5. **No `fetchAllUsersFromSupabase()`.** v1 had a function that returned all user emails — PII disclosure (BUG-N3). Never query all users. Query only the current user or specific users by ID.

6. **Auth callback.** `/callback` route exchanges the code for a session, then redirects to the app. Handle errors gracefully (show error page, not blank screen).
