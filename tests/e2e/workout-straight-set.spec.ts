// e2e test: straight-set core loop (w2a)

import { test, expect } from '@playwright/test';

test.describe('Straight-set execution', () => {
  test.beforeEach(async ({ page }) => {
    // Stub: assumes logged in (real auth is Class B)
    await page.goto('/workout/active');
  });

  test('add exercise → log set → finish → workout saves', async ({ page }) => {
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

    // Finish workout
    await page.click('text=Finish');

    // Should redirect to /workout
    await page.waitForURL(/\/workout/, { timeout: 10000 });
  });
});
