# QA lane — tests/

> Rules for end-to-end tests. Read before adding/changing tests. Global rules in /AGENTS.md apply.

## What lives here
- `tests/e2e/`  → Playwright critical-path smoke tests
- `playwright.config.ts` at repo root

## Purpose
Catch the regressions that hurt v1: data loss on save, auth bounce/white-screen, cross-account
leakage, broken navigation. Tests are the merge gate — no green, no merge.

## Rules
1. **Critical-path first.** Cover: login → land in app, complete a workout → data persists after
   reload, navigate every nav tab without white-screen, log out → log in as a different user (no
   leaked data). These map to v1's worst incidents (INC-003, BUG-005a/b).
2. **Test behaviour, not implementation.** Assert what the user sees (text, URL, persisted data),
   not internal state.
3. **Reload assertions are mandatory** for any save flow — the v1 data-loss bugs only showed after
   refresh. Write → reload → assert still there.
4. **No weakening tests to go green.** Never delete/skip a test to pass CI. If a test is wrong, fix
   the test deliberately and say why in the PR.
5. **Deterministic.** No arbitrary sleeps; use Playwright auto-waiting / `expect().toBeVisible()`.
6. **Seed + clean up** test data; tests must not depend on each other's order.

## Commands
- `npx playwright test` — all must pass before merge.
- New UI feature ⇒ at least one smoke covering its happy path + one reload-persistence assertion.
