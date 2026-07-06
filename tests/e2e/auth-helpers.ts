// E2E auth helpers — mock Supabase auth session for deterministic tests.
// Inject a fake session cookie + mock auth endpoints (browser-side), AND mint
// a properly-signed HS256 access token the SERVER-SIDE proxy can verify
// locally (no network). See src/proxy.ts for the verification + the
// prod-safety guarantee.

import { createHmac } from 'node:crypto';
import { type Page } from '@playwright/test';

const SUPABASE_REF = 'igagmdkdzjkxrwnyvgqk';
const SUPABASE_URL = `https://${SUPABASE_REF}.supabase.co`;
const COOKIE_NAME = `sb-${SUPABASE_REF}-auth-token`;

/**
 * Shared test-only secret. The proxy reads it from `process.env.E2E_JWT_SECRET`
 * (wired in playwright.config.ts -> webServer.env), so both sides agree.
 * This is NOT a production credential: the proxy bypass that consumes it is
 * hard-disabled whenever NODE_ENV === "production".
 */
export const E2E_JWT_SECRET = 'e2e-insecure-test-jwt-secret-not-for-production';

/** Opt-in flag value that enables the proxy's e2e auth bridge (dev only). */
export const E2E_AUTH_BYPASS = '1';

function base64url(input: string): string {
  return Buffer.from(input).toString('base64url');
}

/** Mints a minimal Supabase-shaped HS256 JWT signed with E2E_JWT_SECRET. */
function signTestJwt(claims: Record<string, unknown>): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify(claims));
  const data = `${header}.${payload}`;
  const signature = createHmac('sha256', E2E_JWT_SECRET)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

const fakeUser = {
  id: 'test-user-id',
  email: 'e2e+workout@catalift.test',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: { provider: 'email' },
  user_metadata: { mode: 'client' },
  created_at: new Date().toISOString(),
};

const nowSeconds = Math.floor(Date.now() / 1000);

const fakeSession = {
  access_token: signTestJwt({
    sub: fakeUser.id,
    email: fakeUser.email,
    role: 'authenticated',
    aud: 'authenticated',
    iss: `${SUPABASE_URL}/auth/v1`,
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  }),
  refresh_token: 'fake-refresh-token',
  expires_in: 3600,
  expires_at: nowSeconds + 3600,
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

  // Mock the workouts table: POST (insert on finish) → 201, and GET (history reads
  // that feed the Previous column + PB detection) → empty list, so tests stay
  // deterministic and never touch the real backend. Trailing `*` covers the
  // `?select=...` query string on reads.
  await page.route(`${SUPABASE_URL}/rest/v1/workouts*`, async (route) => {
    const method = route.request().method();
    if (method === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
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
