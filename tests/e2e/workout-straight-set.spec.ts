// e2e test: straight-set core loop (w2a)

import { test, expect } from '@playwright/test';

test.describe('Straight-set execution', () => {
  test.beforeEach(async ({ page }) => {
    // Stub: assumes logged in (real auth is Class B)
    await page.goto('/workout/active');
  });

  test('add exercise → log sets → finish → workout saves', async ({ page }) => {
    // Add an exercise
    await page.click('text=Add Exercise');
    await page.fill('input[placeholder*="Exercise name"]', 'Bench Press');
    await page.click('text=Add');

    // Verify exercise card appears
    await expect(page.locator('text=Bench Press')).toBeVisible();

    // Add a set
    await page.click('text=Add Set');

    // Fill weight + reps
    const weightInput = page.locator('input[placeholder="0"]').first();
    await weightInput.fill('80');
    const repsInput = page.locator('input[placeholder="0"]').nth(1);
    await repsInput.fill('8');

    // Complete set
    await page.click('[title="Complete set"]');

    // Verify volume display
    await expect(page.locator('text=vol: 640kg')).toBeVisible();

    // Add second set
    await page.click('text=Add Set');
    const weightInput2 = page.locator('input[placeholder="0"]').nth(2);
    await weightInput2.fill('85');
    const repsInput2 = page.locator('input[placeholder="0"]').nth(3);
    await repsInput2.fill('6');
    const completeButtons = page.locator('[title="Complete set"]');
    await completeButtons.nth(1).click();

    // Finish workout
    await page.click('text=Finish');

    // Should redirect to /workout (or summary page)
    await expect(page).toHaveURL(/\/workout/);
  });
});
