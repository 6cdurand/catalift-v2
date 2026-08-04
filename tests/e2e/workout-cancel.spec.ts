// e2e test: discard/cancel an active workout (P-07 — missed port from v1).
// A mis-started session must be discardable without being saved as junk
// history. Regression: the active-workout store is persisted, so a partial
// clear could resurrect the discarded session on hard-refresh (BUG-025-style).

import { test, expect } from '@playwright/test';
import { mockAuthSession } from './auth-helpers';

test.describe('Discard active workout (faithful v1 port)', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);
    // BUG-025: /workout/active no longer auto-starts a workout on mount — drive
    // the real entry point (Start Workout on /workouts) instead.
    await page.goto('/workouts');
    await page.getByRole('button', { name: 'Start Workout' }).click();
    await page.waitForURL(/\/workout\/active$/);
  });

  test('start a workout, log a set, discard it → lands on /workouts, not resurrected on reload, absent from history', async ({
    page,
  }) => {
    await expect(page.getByTestId('add-chip-bar')).toBeVisible();

    // Log one set so the discard actually throws away in-progress work.
    await page.getByRole('button', { name: 'Strength' }).click();
    await page.getByPlaceholder('Search exercises').fill('Bench');
    await page.locator('button:has-text("Barbell Bench Press")').first().click();
    await page.getByRole('button', { name: 'Add Set' }).click();
    await page.locator('input[type="number"]').nth(0).fill('80');
    await page.locator('input[type="number"]').nth(1).fill('8');

    // Trigger the discard control — two-step confirm (v1 UX, ported verbatim).
    await page.getByRole('button', { name: 'Discard' }).click();
    await expect(page.getByText('Discard Workout?')).toBeVisible();

    // Confirm — the dialog's own "Discard" button.
    await page.getByRole('dialog').getByRole('button', { name: 'Discard' }).click();

    // Land on /workouts.
    await page.waitForURL(/\/workouts$/);

    // Regression check: the store is persisted — a partial clear would
    // resurrect the discarded session on hard-refresh. Assert it does not.
    await page.reload();
    await expect(page).toHaveURL(/\/workouts$/);

    // The discarded session must not appear in workout history.
    await expect(page.getByText('No workouts logged yet')).toBeVisible();
  });
});
