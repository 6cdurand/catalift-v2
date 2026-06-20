---
always_on: true
description: Enforces import boundary rules — no cross-feature imports in src/features/
---

# Import Boundaries

Features in `src/features/` are self-contained domains. They may NOT import from other features.

## Allowed imports from a feature

- `@/lib/*` — shared infrastructure (supabase clients, storage, sentry)
- `@/components/ui/*` — shared UI components
- `@/hooks/*` — shared hooks
- `@/config/*` — constants, env, feature-flags
- `@/types/*` — shared types
- `@/utils/*` — shared utilities
- Relative imports within the same feature (`./`, `../`)

## Forbidden imports from a feature

- `@/features/<other-feature>/*` — cross-feature imports
- `@/app/*` — app router files (features don't import pages)

## Enforcement

This is also enforced by ESLint `no-restricted-imports` in `eslint.config.mjs`. The rule blocks `@/features/*/*` patterns. If you see a lint error about this, you've violated the boundary — fix it by moving shared code to `lib/`, `components/`, `hooks/`, or `utils/`.
