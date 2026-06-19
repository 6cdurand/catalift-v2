# Catalift v2 — Architecture

> Coaching operating system for PTs. Opinionated workflows, not a generic gym log.

## Stack

- **Frontend:** Next.js 15 (App Router) + Tailwind + shadcn/ui
- **State:** Zustand with persist (user-scoped keys)
- **Backend:** Supabase (Postgres + Auth + Realtime + Storage)
- **Mobile:** Capacitor wrap (server.url loads deployed site)
- **Hosting:** Netlify
- **Monitoring:** Sentry (from first commit)
- **E2E:** Playwright critical-path smoke tests
- **CI:** GitHub Actions (lint + type check + e2e on every PR)

## Module boundaries

Each module is owned by one agent. No shared god-files. Clean imports.

```
src/
├── modules/
│   ├── auth/           → auth-agent (Supabase Auth, RLS, sessions, identity)
│   ├── workout-engine/ → workout-engine-agent (builder, sets/reps/volume, PBs, circuit/cardio)
│   ├── trainer-ops/    → trainer-ops-agent (clients, sessions, payments, packages, calendar, booking)
│   ├── messaging/      → messaging-agent (conversations, messages, notifications, realtime)
│   ├── data-sync/      → data-sync-agent (Supabase sync, offline-first, cross-device, IndexedDB)
│   └── design-system/  → design-agent (UI components, a11y, responsive)
├── mobile/             → mobile-agent (Capacitor, native bridges, push, HealthKit/Google Fit)
├── lib/
│   ├── supabase.ts     → shared client (owned by data-sync)
│   └── storage.ts      → IndexedDB + localStorage abstraction
├── app/                → Next.js routes (thin — delegate to modules)
tests/
├── e2e/                → qa-agent (Playwright)
├── unit/               → per-module
└── integration/        → per-module
supabase/
├── migrations/         → data-sync-agent (ONLY agent that writes SQL)
└── policies/           → auth-agent (RLS policies)
```

## Critical design rules (lessons from v1)

1. **Supabase Auth is the ONLY credential source.** No localStorage fast-path. No `password_hash` column. No legacy auth paths.
2. **RLS is strict from day one.** `canonical_user_id()` on every table. No `USING(true)` permissive policies, ever.
3. **Every write is `await`-ed** with retry (max 3, exponential backoff) + optimistic rollback. No fire-and-forget.
4. **IndexedDB for bulky caches** (workout history, exercise library, templates). localStorage for auth tokens + small UI state only.
5. **All persist keys are user-scoped:** `apex-<resource>-<userId>`. No unscoped global caches.
6. **Hydrate = MERGE, never REPLACE.** Server-wins on conflict, id-keyed.
7. **Re-hydrate on foreground:** `visibilitychange` (web) + `App.resume` (mobile).
8. **One session-counting authority:** app-side ledger + one offset. No offset-mutating triggers.
9. **Volume = SUM(set.weight * set.reps)** across all sets in an exercise, not MAX.
10. **PB detection runs server-side** (RPC) to prevent client drift.
11. **Account deletion is server-side cascade** (auth.users + public.users + all child rows).
12. **No full-table client fetches** of user data — use scoped RPCs (`SECURITY DEFINER`).

## Agent ownership

| Agent | Module | Class | Model tier |
|---|---|---|---|
| auth-agent | `auth/` + `policies/` | B (security) | Opus/Sonnet |
| workout-engine-agent | `workout-engine/` | A | Sonnet/GLM-5.2 |
| trainer-ops-agent | `trainer-ops/` | A | Sonnet/GLM-5.2 |
| messaging-agent | `messaging/` | A | Sonnet/GLM-5.2 |
| data-sync-agent | `data-sync/` + `lib/` + `migrations/` | B (data) | Sonnet |
| mobile-agent | `mobile/` | A | Sonnet/GLM-5.2 |
| qa-agent | `tests/` + CI | A | GLM-5.2/Ollama |
| design-agent | `design-system/` | A | GLM-5.2/Ollama |

**Class A** = application code (agent can implement + PR autonomously).
**Class B** = security/data-critical (conductor review required before merge).

## Task transport

Tasks are GitHub Issues with domain labels. Devin picks them up autonomously, implements, creates PRs. Command-center reviews PRs via GitHub MCP. Christo merges.

## New features (not in v1)

- **Booking system:** clients book available slots, trainers set pricing tiers (off-peak/standard/peak/premium)
- **Notifications:** `seen_at` timestamp, badge = unread count, Supabase Realtime, push via APNs/FCM
- **Health data:** HealthKit (iOS) + Google Fit (Android) step count via Capacitor health plugin
- **Calendar fresh start:** clean event/session model with booking integration
