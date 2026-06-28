// E2E auth helpers — mock Supabase auth session for deterministic tests.
// Uses the same pattern as shell.spec.ts: inject fake session cookie + mock auth endpoints.

import { type Page } from '@playwright/test';

const SUPABASE_REF = 'igagmdkdzjkxrwnyvgqk';
const SUPABASE_URL = `https://${SUPABASE_REF}.supabase.co`;
const COOKIE_NAME = `sb-${SUPABASE_REF}-auth-token`;

const fakeUser = {
  id: 'test-user-id',
  email: 'e2e+workout@catalift.test',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: { provider: 'email' },
  user_metadata: { mode: 'client' },
  created_at: new Date().toISOString(),
};

const fakeSession = {
  access_token: 'fake-access-token',
  refresh_token: 'fake-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: fakeUser,
};

/**
 * Mocks Supabase auth endpoints and injects a fake session cookie.
 * The app's useSession() hook reads the cookie via createBrowserClient,
 * so this gives the app a valid session without hitting a real backend.
 *
 * Also mocks the REST API for user role lookup (same as shell.spec.ts)
 * and workout insert (POST /rest/v1/workouts) so the full workout flow
 * works deterministically.
 */
export async function mockAuthSession(page: Page): Promise<void> {
  // Mock auth endpoints
  await page.route(`${SUPABASE_URL}/auth/v1/**`, async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/user') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fakeUser),
      });
      return;
    }

    if (url.includes('/token') && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fakeSession),
      });
      return;
    }

    await route.continue();
  });

  // Mock user role lookup (shell needs public.users.role)
  await page.route(`${SUPABASE_URL}/rest/v1/users*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ role: 'client' }),
    });
  });

  // Mock workout insert (POST /rest/v1/workouts)
  await page.route(`${SUPABASE_URL}/rest/v1/workouts`, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }
    await route.continue();
  });

  // Inject fake session cookie
  await page.context().addCookies([
    {
      name: COOKIE_NAME,
      value: encodeURIComponent(JSON.stringify(fakeSession)),
      domain: 'localhost',
      path: '/',
    },
  ]);
}
