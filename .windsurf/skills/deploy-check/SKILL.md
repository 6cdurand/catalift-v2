---
name: deploy-check
description: Pre-deploy verification checklist — env vars, tsc, lint, e2e, Sentry config. Use before deploying or when asked to verify deploy readiness.
---

# Deploy Check

Before deploying (or when asked to verify deploy readiness), run this checklist:

## Steps

1. **Check environment variables:**
   ```bash
   echo $NEXT_PUBLIC_SUPABASE_URL
   echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```
   Both must be set. If not, deployment will fail.

2. **Run type check:**
   ```bash
   npx tsc --noEmit
   ```
   Must be zero errors.

3. **Run lint:**
   ```bash
   npm run lint
   ```
   Must be zero errors.

4. **Run e2e tests:**
   ```bash
   npx playwright test
   ```
   All must pass.

5. **Check Sentry config (if enabled):**
   - `src/lib/sentry.ts` — is `initSentry()` called in `app/layout.tsx`?
   - `SENTRY_DSN` env var set? (if not, Sentry is disabled — note this in deploy summary)

6. **Check feature flags:**
   - Read `src/config/feature-flags.ts`
   - Which flags are enabled? Only enable what's production-ready.

7. **Check for uncommitted changes:**
   ```bash
   git status
   ```
   Must be clean. Uncommitted changes don't deploy.

8. **Check branch:**
   ```bash
   git branch --show-current
   ```
   Must be `main`. Only main deploys to production.

## Report

After running all checks, report:
- ✅ or ❌ for each check
- Any issues that need fixing before deploy
- Feature flags that will be active in this deploy
