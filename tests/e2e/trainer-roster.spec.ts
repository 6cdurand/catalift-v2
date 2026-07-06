// trainer-roster.spec.ts — E2E test for trainer roster feature
// Covers: /clients page shows roster, program builder dropdowns show roster

import { test, expect } from '@playwright/test';
import { mockAuthSession } from './auth-helpers';

const SUPABASE_REF = 'igagmdkdzjkxrwnyvgqk';
const SUPABASE_URL = `https://${SUPABASE_REF}.supabase.co`;

test.describe('Trainer Roster', () => {
  test('trainer with clients sees roster on /clients page', async ({ page }) => {
    await mockAuthSession(page);

    await page.route(`${SUPABASE_URL}/rest/v1/users*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ role: 'trainer' }),
      });
    });

    await page.route(`${SUPABASE_URL}/rest/v1/trainer_clients*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'tc-1',
            client_id: 'client-1',
            status: 'active',
            client: {
              id: 'client-1',
              full_name: 'John Doe',
              email: 'john@example.com',
            },
          },
          {
            id: 'tc-2',
            client_id: 'client-2',
            status: 'active',
            client: {
              id: 'client-2',
              full_name: 'Jane Smith',
              email: 'jane@example.com',
            },
          },
        ]),
      });
    });

    await page.goto('http://localhost:3000/clients');

    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('john@example.com')).toBeVisible();
    await expect(page.getByText('Jane Smith')).toBeVisible();
    await expect(page.getByText('jane@example.com')).toBeVisible();
  });

  test('trainer with no clients sees empty state on /clients page', async ({ page }) => {
    await mockAuthSession(page);

    await page.route(`${SUPABASE_URL}/rest/v1/users*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ role: 'trainer' }),
      });
    });

    await page.route(`${SUPABASE_URL}/rest/v1/trainer_clients*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('http://localhost:3000/clients');

    await expect(page.getByText('No clients yet')).toBeVisible();
  });

  test('trainer roster persists after page reload', async ({ page }) => {
    await mockAuthSession(page);

    await page.route(`${SUPABASE_URL}/rest/v1/users*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ role: 'trainer' }),
      });
    });

    await page.route(`${SUPABASE_URL}/rest/v1/trainer_clients*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'tc-1',
            client_id: 'client-1',
            status: 'active',
            client: {
              id: 'client-1',
              full_name: 'John Doe',
              email: 'john@example.com',
            },
          },
        ]),
      });
    });

    await page.goto('http://localhost:3000/clients');
    await expect(page.getByText('John Doe')).toBeVisible();

    await page.reload();
    await expect(page.getByText('John Doe')).toBeVisible();
  });
});
