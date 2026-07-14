// e2e test: straight-set core loop (w2a)

import { test, expect } from '@playwright/test';
import { mockAuthSession } from './auth-helpers';

test.describe('Straight-set execution', () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth session (deterministic — same pattern as shell.spec.ts)
    await mockAuthSession(page);
    await page.goto('/workout/active');
  });

  test('add exercise → log set → finish → workout saves', async ({ page }) => {
    // Wait for page to be ready (workout should auto-start)
    await page.waitForTimeout(2000); // Give time for workout to auto-start and hydration

    // Add an exercise
    await page.click('text=Add Exercise');
    await page.fill('input[placeholder*="Search exercises"]', 'Bench');
    // Click the first result (Barbell Bench Press)
    await page.locator('button:has-text("Barbell Bench Press")').first().click();

    // Verify exercise card appears
    await expect(page.locator('text=Barbell Bench Press')).toBeVisible();

    // Add a set
    await page.click('text=Add Set');

    // Fill weight + reps (use more specific selectors)
    await page.locator('input[type="number"]').nth(0).fill('80');
    await page.locator('input[type="number"]').nth(1).fill('8');

    // Complete set
    await page.click('[title="Complete set"]');

    // Verify volume display
    await expect(page.locator('text=vol: 640kg')).toBeVisible();

    // Fix B: a per-set rest countdown becomes visible after completing the set
    await expect(page.getByTestId('set-rest-timer')).toBeVisible();

    // Finish workout
    await page.click('text=Finish');

    // Summary screen appears
    await expect(page.locator('text=Workout Complete')).toBeVisible({ timeout: 10000 });

    // Click Done → redirect to /workout
    await page.click('text=Done');
    await page.waitForURL(/\/workout$/, { timeout: 10000 });
  });
});
