// e2e: central server-side auth gate for protected routes (BUG-012).
//
// The proxy (src/proxy.ts) is the authoritative gate. These tests assert the
// behaviour at the HTTP level: a signed-OUT hard-nav to a protected route is
// server-redirected to /login BEFORE the page renders (no client flash), while
// public routes stay reachable and a signed-IN user reaches the app normally.

import { test, expect } from '@playwright/test';
import { mockAuthSession } from './auth-helpers';

const PROTECTED_ROUTES = [
  '/today',
  '/workouts',
  '/program',
  '/builder',
  '/profile',
  '/workout/active',
];

test.describe('Auth gate (BUG-012) — signed OUT', () => {
  for (const path of PROTECTED_ROUTES) {
    test(`hard-nav to ${path} redirects to /login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login(\?|$)/);
      // The login UI actually rendered — not a white screen / loop.
      await expect(page.getByText('Welcome Back')).toBeVisible();
    });
  }

  test('can still reach /login', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Welcome Back')).toBeVisible();
  });

  test('can still reach /signup', async ({ page }) => {
    await page.goto('/signup');
    await expect(page).toHaveURL(/\/signup$/);
    await expect(
      page.getByText('Start your fitness journey today'),
    ).toBeVisible();
  });

  test('can still reach /reset-password', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page).toHaveURL(/\/reset-password$/);
  });

  test('/callback stays reachable mid-flow (handled by the route, not the gate)', async ({
    page,
  }) => {
    // With no `code`, the public callback route handler runs and redirects with
    // its OWN error param. Reaching that proves the gate did NOT bounce it to a
    // bare /login (which would have no query string).
    await page.goto('/callback');
    await expect(page).toHaveURL(/\/login\?error=no-code$/);
  });
});

test.describe('Auth gate (BUG-012) — signed IN', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);
  });

  for (const path of ['/today', '/workouts', '/program', '/builder', '/profile']) {
    test(`hard-nav to ${path} renders the app shell (no bounce)`, async ({
      page,
    }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      // App shell mounted (proves not redirected to /login, no white screen).
      await expect(page.getByTestId('app-tab-bar')).toBeVisible();
    });
  }

  test('hard-nav to /workout/active renders (no bounce, no white screen)', async ({
    page,
  }) => {
    await page.goto('/workout/active');
    await expect(page).toHaveURL(/\/workout\/active$/);
    await expect(page.getByText('Add Block')).toBeVisible({ timeout: 10000 });
  });

  test('visiting /login while signed in redirects to /today', async ({
    page,
  }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/today$/);
    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  });
});
