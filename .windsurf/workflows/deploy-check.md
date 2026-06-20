---
description: Pre-deploy verification checklist — env vars, tsc, lint, e2e, Sentry config, feature flags
---

# Deploy Check

Run the pre-deploy verification checklist.

## Steps

1. **Invoke the `deploy-check` skill** — it has the full checklist:
   - Check env vars are set
   - Run `npx tsc --noEmit`
   - Run `npm run lint`
   - Run `npx playwright test`
   - Check Sentry config
   - Check feature flags
   - Check git status is clean
   - Check branch is main

2. **Report back:** ✅/❌ for each check, any issues to fix before deploy.
