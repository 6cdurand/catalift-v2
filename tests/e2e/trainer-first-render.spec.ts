// trainer-first-render.spec.ts — BUG-024 regression lock.
//
// A trainer's very first `/today` render must never show the athlete surface
// while `public.users.role` is still in flight. Delay the role response to
// simulate a slow profile fetch, then assert the athlete-only day strip never
// entered the DOM (via a MutationObserver installed before any app script
// runs) and that the trainer surface renders once the role resolves.

import { test, expect, type Page, type Route } from '@playwright/test';
import { mockAuthSession } from './auth-helpers';

const SUPABASE_REF = 'igagmdkdzjkxrwnyvgqk';
const SUPABASE_URL = `https://${SUPABASE_REF}.supabase.co`;
// Generous relative to network latency so it reliably outlasts the OTHER
// mocked page data (scheduled sessions / program / stats), which resolve
// near-instantly — otherwise a fast first compile in dev can race past a
// too-small delay and mask the flash this test exists to catch.
const ROLE_DELAY_MS = 2000;

type ProbeWindow = typeof window & { __athleteSurfaceSeen?: boolean };

/**
 * Installed via `addInitScript`, so it observes from before any app script
 * runs. Deliberately inspects each MutationRecord's `addedNodes` instead of
 * re-querying the live document: React can insert AND remove a node within
 * the same commit/microtask batch, in which case a live `querySelector`
 * check in the observer callback would already see it gone. Checking
 * `addedNodes` catches the insertion regardless of what happens after it.
 */
async function installAthleteSurfaceProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as ProbeWindow).__athleteSurfaceSeen = false;
    const matches = (node: Node): boolean =>
      node.nodeType === 1 &&
      ((node as Element).getAttribute('data-testid') === 'day-strip' ||
        !!(node as Element).querySelector?.('[data-testid="day-strip"]'));
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (matches(node)) (window as ProbeWindow).__athleteSurfaceSeen = true;
        });
      }
    });
    // `document.documentElement` is not guaranteed to exist yet at the point
    // `addInitScript` runs (it fires before the document is fully
    // constructed) — retry until it does, rather than let `.observe()` throw
    // and silently drop the observer.
    const attach = () => {
      if (document.documentElement) {
        observer.observe(document.documentElement, { childList: true, subtree: true });
      } else {
        setTimeout(attach, 0);
      }
    };
    attach();
  });
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

/**
 * `mockAuthSession` registers a fast `/rest/v1/users*` route returning
 * `{ role: 'client' }`. Override it AFTER calling mockAuthSession with a
 * delayed trainer response — Playwright matches the most-recently-registered
 * route first — so `useUserRole` stays `loading: true` for a beat after the
 * page mounts, exactly like a slow profile fetch post-signup.
 */
async function mockSlowTrainerRole(page: Page) {
  await mockAuthSession(page);

  // Catch-all for every other table this page touches (scheduled sessions,
  // active program, stats, trainer roster/schedule) — irrelevant to this
  // render-gating assertion, so an empty list keeps every hook settled.
  await page.route(`${SUPABASE_URL}/rest/v1/**`, (route) => json(route, []));

  await page.route(`${SUPABASE_URL}/rest/v1/users*`, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, ROLE_DELAY_MS));
    await json(route, { role: 'trainer' });
  });
}

test.describe('Trainer /today — first-render identity gate (BUG-024)', () => {
  test('never renders the athlete surface while the role resolves, then renders the trainer surface', async ({
    page,
  }) => {
    await installAthleteSurfaceProbe(page);
    await mockSlowTrainerRole(page);

    await page.goto('/today');

    // Once the delayed role resolves, the trainer surface appears.
    await expect(page.getByTestId('trainer-day-strip')).toBeVisible({
      timeout: ROLE_DELAY_MS + 4000,
    });

    // The athlete-only day strip must never have entered the DOM, at any
    // point since navigation — not even for a single commit.
    const athleteSurfaceSeen = await page.evaluate(
      () => (window as ProbeWindow).__athleteSurfaceSeen,
    );
    expect(athleteSurfaceSeen).toBe(false);
    await expect(page.getByTestId('day-strip')).toHaveCount(0);
  });
});
