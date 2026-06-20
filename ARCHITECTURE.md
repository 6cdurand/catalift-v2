# Catalift v2 — Architecture

> Coaching operating system for PTs. Opinionated workflows, not a generic gym log.

## Stack

- **Frontend:** Next.js 16 (App Router) + Tailwind v4 + shadcn/ui
- **State:** Zustand with persist (user-scoped keys)
- **Backend:** Supabase (Postgres + Auth + Realtime + Storage)
- **Mobile:** Capacitor wrap (server.url loads deployed site)
- **Hosting:** Netlify
- **Monitoring:** Sentry (from first commit)
- **E2E:** Playwright critical-path smoke tests
- **CI:** GitHub Actions (lint + type check + e2e on every PR)

## Project structure

Feature-driven architecture. Each feature is self-contained (api + components + hooks + stores + tests). Shared infrastructure lives outside features. No god-files. Clean imports. No circular dependencies.

```
catalift-v2/
├── src/
│   ├── app/                        → Next.js routes (thin — delegate to features)
│   │   ├── (auth)/                 → unauthenticated route group
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── callback/route.ts
│   │   ├── (app)/                  → authenticated route group
│   │   │   ├── layout.tsx          → app shell (nav + content)
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── clients/
│   │   │   ├── workouts/
│   │   │   ├── programs/
│   │   │   ├── calendar/
│   │   │   ├── payments/
│   │   │   └── messages/
│   │   ├── layout.tsx              → root layout + providers
│   │   ├── error.tsx               → global error boundary
│   │   └── globals.css
│   │
│   ├── features/                   → self-contained domain modules
│   │   ├── auth/                   → auth-agent
│   │   │   ├── api/                → server actions, RPC calls
│   │   │   ├── components/         → login-form, signup-form
│   │   │   ├── hooks/              → use-session, use-require-auth
│   │   │   ├── stores/             → auth-store (Zustand)
│   │   │   ├── types.ts
│   │   │   └── __tests__/
│   │   │
│   │   ├── workout-engine/         → workout-engine-agent
│   │   │   ├── api/                → server actions (completeWorkout, detectPBs)
│   │   │   ├── components/
│   │   │   │   ├── builder/        → workout-builder, program-builder, block-editor
│   │   │   │   ├── completion/     → completion UI
│   │   │   │   └── runtime/        → active workout tracker
│   │   │   ├── hooks/              → use-workout-runtime, use-set-tracker
│   │   │   ├── lib/                → volume-calc, pb-detection, exercise-history
│   │   │   ├── stores/             → workout-store
│   │   │   ├── types.ts
│   │   │   └── __tests__/
│   │   │
│   │   ├── trainer-ops/            → trainer-ops-agent
│   │   │   ├── api/
│   │   │   ├── components/
│   │   │   │   ├── clients/        → client-list, client-card, client-groups
│   │   │   │   ├── sessions/       → session-counter, session-log
│   │   │   │   ├── payments/       → payment-log, package-manager
│   │   │   │   ├── calendar/       → calendar-view, event-model
│   │   │   │   └── booking/        → booking-flow, pricing-tiers, availability
│   │   │   ├── hooks/
│   │   │   ├── lib/                → session-counter, payment-logic
│   │   │   ├── stores/
│   │   │   ├── types.ts
│   │   │   └── __tests__/
│   │   │
│   │   ├── messaging/              → messaging-agent
│   │   │   ├── api/
│   │   │   ├── components/
│   │   │   │   ├── conversations/  → conversation-list, conversation-view, message-input
│   │   │   │   └── notifications/  → notification-panel, notification-badge, mark-all-read
│   │   │   ├── hooks/
│   │   │   ├── lib/                → realtime channels
│   │   │   ├── stores/
│   │   │   ├── types.ts
│   │   │   └── __tests__/
│   │   │
│   │   └── data-sync/              → data-sync-agent (replaces v1 god-file)
│   │       ├── api/                → hydrate RPCs, sync endpoints
│   │       ├── lib/
│   │       │   ├── sync-with-retry.ts
│   │       │   ├── hydrate.ts
│   │       │   ├── hydrate-trigger.ts
│   │       │   └── optimistic-rollback.ts
│   │       ├── domain/             → per-domain sync (<300 LOC each)
│   │       │   ├── auth-sync.ts
│   │       │   ├── workout-sync.ts
│   │       │   ├── trainer-sync.ts
│   │       │   └── message-sync.ts
│   │       ├── types.ts
│   │       └── __tests__/
│   │
│   ├── components/                 → shared UI (design system)
│   │   ├── ui/                     → shadcn/ui (button, input, card, dialog)
│   │   ├── layouts/                → app-shell, mobile-nav, desktop-nav
│   │   └── states/                 → loading-state, error-state, empty-state
│   │
│   ├── lib/                        → infrastructure
│   │   ├── supabase.ts             → browser client
│   │   ├── supabase-server.ts      → server client (cookies)
│   │   ├── storage.ts              → IndexedDB + localStorage abstraction
│   │   └── sentry.ts               → error monitoring
│   │
│   ├── hooks/                      → shared hooks
│   │   ├── use-debounce.ts
│   │   ├── use-media-query.ts
│   │   └── use-foreground-sync.ts
│   │
│   ├── config/                     → app config
│   │   ├── constants.ts            → app-wide constants
│   │   ├── env.ts                  → typed env var access
│   │   └── feature-flags.ts        → toggle strength-rating, medals, etc.
│   │
│   ├── types/                      → global shared types
│   │   ├── database.ts             → Supabase generated types
│   │   └── common.ts
│   │
│   └── utils/                      → pure utilities
│       ├── user-scoped-key.ts      → catalift-<resource>-<userId>
│       ├── date.ts
│       └── id.ts
│
├── capacitor.config.ts             → project root (not in src/)
├── native/                         → native config + bridges
│   ├── ios/
│   ├── android/
│   └── plugins/                    → health-kit, google-fit, push, native-auth
│
├── supabase/
│   └── migrations/                 → ONE folder, versioned, ordered (data-sync-agent ONLY)
│       ├── 001_initial_schema.sql
│       ├── 002_rls_policies.sql    → policies IN migrations, not separate
│       ├── 003_functions.sql
│       └── 004_seed_data.sql
│
├── .devin/
│   ├── guidelines.md               → general rules
│   └── modules/                    → per-agent expertise
│       ├── auth-agent.md
│       ├── workout-engine-agent.md
│       ├── trainer-ops-agent.md
│       ├── messaging-agent.md
│       ├── data-sync-agent.md
│       ├── mobile-agent.md
│       ├── qa-agent.md
│       └── design-agent.md
│
├── docs/
│   ├── data-model.md
│   ├── sync-architecture.md
│   ├── rls-policies.md
│   └── api-contracts.md
│
├── .github/
│   ├── workflows/ci.yml            → lint + tsc + e2e on every PR
│   └── ISSUE_TEMPLATE/task.md
│
├── ARCHITECTURE.md
├── CLAUDE.md
└── package.json
```

### Import rules

- `features/*` may import from `components/`, `lib/`, `hooks/`, `config/`, `types/`, `utils/`
- `features/*` may NOT import from other features (no cross-feature imports)
- `components/` may import from `lib/`, `hooks/`, `config/`, `types/`, `utils/`
- `app/` may import from `features/`, `components/`, `lib/`, `hooks/`, `config/`
- `lib/` may only import from `types/` and `utils/`
- No circular dependencies. Enforced by ESLint rule `no-restricted-imports`.

## Critical design rules (lessons from v1)

1. **Supabase Auth is the ONLY credential source.** No localStorage fast-path. No `password_hash` column. No legacy auth paths.
2. **RLS is strict from day one.** `canonical_user_id()` on every table. No `USING(true)` permissive policies, ever.
3. **Every write is `await`-ed** with retry (max 3, exponential backoff) + optimistic rollback. No fire-and-forget.
4. **IndexedDB for bulky caches** (workout history, exercise library, templates). localStorage for auth tokens + small UI state only.
5. **All persist keys are user-scoped:** `catalift-<resource>-<userId>`. No unscoped global caches.
6. **Hydrate = MERGE, never REPLACE.** Server-wins on conflict, id-keyed.
7. **Re-hydrate on foreground:** `visibilitychange` (web) + `App.resume` (mobile).
8. **One session-counting authority:** app-side ledger + one offset. No offset-mutating triggers.
9. **Volume = SUM(set.weight * set.reps)** across all sets in an exercise, not MAX.
10. **PB detection runs server-side** (RPC) to prevent client drift.
11. **Account deletion is server-side cascade** (auth.users + public.users + all child rows).
12. **No full-table client fetches** of user data — use scoped RPCs (`SECURITY DEFINER`).
13. **Feature flags for non-essential features.** Strength rating, medals, social feed — all behind flags, disabled by default.
14. **Workout runtime state in IndexedDB.** Entered weights/reps survive tab switch/close.
15. **Unified workout-completion pipeline.** One function: sets → PBs → history → volume, in a single transaction.

## Agent ownership

| Agent | Feature | Class | Model tier |
|---|---|---|---|
| auth-agent | `features/auth/` + RLS migrations | B (security) | Opus/Sonnet |
| workout-engine-agent | `features/workout-engine/` | A | Sonnet/GLM-5.2 |
| trainer-ops-agent | `features/trainer-ops/` | A | Sonnet/GLM-5.2 |
| messaging-agent | `features/messaging/` | A | Sonnet/GLM-5.2 |
| data-sync-agent | `features/data-sync/` + `lib/` + `supabase/migrations/` | B (data) | Sonnet |
| mobile-agent | `native/` + `capacitor.config.ts` | A | Sonnet/GLM-5.2 |
| qa-agent | `__tests__/` + CI workflow | A | GLM-5.2/Ollama |
| design-agent | `components/` | A | GLM-5.2/Ollama |

**Class A** = application code (agent can implement + PR autonomously).
**Class B** = security/data-critical (conductor review required before merge).

## Task transport

Tasks are GitHub Issues with domain labels. Devin picks them up autonomously, implements, creates PRs. Command-center reviews PRs via GitHub MCP. Christo merges.

See `docs/workflow.md` for the full issue-to-merge pipeline.

## New features (not in v1)

- **Booking system:** clients book available slots, trainers set pricing tiers (off-peak/standard/peak/premium)
- **Notifications:** `seen_at` timestamp, badge = unread count, Supabase Realtime, push via APNs/FCM
- **Health data:** HealthKit (iOS) + Google Fit (Android) step count via Capacitor health plugin
- **Calendar fresh start:** clean event/session model with booking integration
- **Client groups:** group pages for cohort-based coaching
- **Feature flags:** strength rating, medals, social feed — disabled by default, enabled via config
