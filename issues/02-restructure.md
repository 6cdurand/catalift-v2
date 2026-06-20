# Task: Restructure to feature-driven architecture

## Domain
`domain:infra`

## Class
A

## What to build

Restructure the project from the current `modules/` layout to the feature-driven layout defined in ARCHITECTURE.md. The scaffold is already committed — this task moves files into the new structure.

### 1. Create the new folder structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx        ← move from app/auth/login/
│   │   ├── signup/page.tsx       ← move from app/auth/signup/
│   │   └── callback/route.ts     ← move from app/auth/callback/
│   ├── (app)/
│   │   └── layout.tsx            → placeholder app shell (nav + content)
│   ├── layout.tsx                ← keep existing root layout
│   ├── error.tsx                 → NEW: global error boundary
│   ├── page.tsx                  ← keep existing landing page
│   └── globals.css               ← keep existing
│
├── features/
│   ├── auth/
│   │   ├── api/                  → empty (.gitkeep)
│   │   ├── components/           → empty (.gitkeep)
│   │   ├── hooks/
│   │   │   ├── use-session.ts    ← move from modules/auth/
│   │   │   └── use-require-auth.ts ← move from modules/auth/
│   │   ├── stores/               → empty (.gitkeep)
│   │   ├── types.ts              → empty placeholder
│   │   └── __tests__/            → empty (.gitkeep)
│   │   └── index.ts              ← move from modules/auth/
│   │
│   ├── workout-engine/           → empty structure
│   │   ├── api/                  → .gitkeep
│   │   ├── components/           → .gitkeep
│   │   ├── hooks/                → .gitkeep
│   │   ├── lib/                  → .gitkeep
│   │   ├── stores/               → .gitkeep
│   │   ├── types.ts              → empty placeholder
│   │   └── __tests__/            → .gitkeep
│   │
│   ├── trainer-ops/              → same empty structure
│   ├── messaging/                → same empty structure
│   └── data-sync/                → same empty structure
│       ├── api/                  → .gitkeep
│       ├── lib/                  → .gitkeep
│       ├── domain/               → .gitkeep
│       ├── types.ts              → empty placeholder
│       └── __tests__/            → .gitkeep
│
├── components/
│   ├── ui/                       → .gitkeep (shadcn/ui will go here)
│   ├── layouts/                  → .gitkeep
│   └── states/                   → .gitkeep
│
├── lib/
│   ├── supabase.ts               ← move from existing lib/
│   ├── supabase-server.ts        ← move from existing lib/
│   ├── storage.ts                ← move from existing lib/
│   └── sentry.ts                 → NEW: placeholder Sentry init
│
├── hooks/                        → .gitkeep
│
├── config/
│   ├── constants.ts              → NEW: empty placeholder
│   ├── env.ts                    → NEW: typed env var access
│   └── feature-flags.ts          → NEW: strength_rating=false, medals=false, social_feed=false
│
├── types/
│   ├── database.ts               → NEW: empty placeholder (Supabase types later)
│   └── common.ts                 → NEW: empty placeholder
│
└── utils/
    ├── user-scoped-key.ts        → NEW: userScopedKey(resource, userId) => `catalift-${resource}-${userId}`
    ├── date.ts                   → NEW: empty placeholder
    └── id.ts                     → NEW: empty placeholder
```

### 2. Move auth files

Move existing auth files from `src/modules/auth/` to `src/features/auth/`:
- `use-session.ts` → `features/auth/hooks/use-session.ts`
- `use-require-auth.ts` → `features/auth/hooks/use-require-auth.ts`
- `logout.ts` → `features/auth/api/logout.ts`
- `index.ts` → `features/auth/index.ts`

Update all imports that reference `modules/auth` to reference `features/auth`.

### 3. Move auth routes

Move `src/app/auth/` to `src/app/(auth)/`:
- `auth/login/page.tsx` → `(auth)/login/page.tsx`
- `auth/signup/page.tsx` → `(auth)/signup/page.tsx`
- `auth/callback/route.ts` → `(auth)/callback/route.ts`

Update any internal references.

### 4. Create config/feature-flags.ts

```typescript
export const FEATURE_FLAGS = {
  strengthRating: false,
  medals: false,
  socialFeed: false,
  booking: false,
  healthData: false,
  notifications: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}
```

### 5. Create config/env.ts

```typescript
function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env var: ${key}`);
  return value;
}

export const env = {
  supabaseUrl: getEnv('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
} as const;
```

### 6. Create utils/user-scoped-key.ts

```typescript
export function userScopedKey(resource: string, userId: string): string {
  return `catalift-${resource}-${userId}`;
}
```

### 7. Create app/error.tsx

```typescript
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="mt-2 text-sm text-gray-500">{error.message}</p>
        <button
          onClick={reset}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm text-white"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
```

### 8. Create lib/sentry.ts placeholder

```typescript
// Sentry will be initialized here when DSN is configured.
// Export placeholder for now.
export function initSentry() {
  // TODO: Initialize Sentry when SENTRY_DSN is set
}
```

### 9. Delete old structure

Remove the old `src/modules/` folder entirely after all files are moved.

### 10. Update proxy.ts

If `proxy.ts` references `modules/auth`, update to `features/auth`.

### 11. Create ESLint import boundary rule

Add to `.eslintrc.json` (or `eslint.config.mjs`):

```json
{
  "rules": {
    "no-restricted-imports": ["error", {
      "patterns": [
        {
          "group": ["@/features/*/*"],
          "message": "Features may not import from other features. Use shared lib/components/hooks instead."
        }
      ]
    }]
  }
}
```

### 12. Update all import paths

Search and replace all imports referencing `@/modules/` to `@/features/`. Verify no broken imports remain.

## Acceptance criteria

- [ ] `npm run dev` starts without errors
- [ ] `tsc --noEmit` clean
- [ ] `npm run lint` clean (including new import boundary rule)
- [ ] `npx playwright test` passes (3/3 smoke tests)
- [ ] Login page renders at `/login` (not `/auth/login`)
- [ ] Signup page renders at `/signup` (not `/auth/signup`)
- [ ] No `src/modules/` directory remains
- [ ] All feature folders have correct structure (api/components/hooks/stores/types/__tests__)
- [ ] `config/feature-flags.ts` exists with flags disabled
- [ ] `config/env.ts` exists with typed env access
- [ ] `utils/user-scoped-key.ts` exists
- [ ] `app/error.tsx` exists
- [ ] `lib/sentry.ts` exists (placeholder)
- [ ] No broken imports (grep for `@/modules/` returns 0 results)

## Context

The scaffold was built with a `modules/` structure. After architectural review, we're moving to a feature-driven structure (industry best practice — "Bulletproof React" pattern). Each feature is self-contained: api + components + hooks + stores + tests. Shared infrastructure (UI components, lib, hooks, config, types, utils) lives outside features. No cross-feature imports allowed.

The scaffold is already committed to main. This task restructures the existing code. Read `ARCHITECTURE.md` for the full target structure and import rules.

## Out of scope

- Do NOT add new features (workout-engine, trainer-ops, etc. stay empty)
- Do NOT change auth logic (just move files)
- Do NOT change Supabase client logic (just move files)
- Do NOT configure Sentry (placeholder only)
- Do NOT add shadcn/ui (just create the folder)
