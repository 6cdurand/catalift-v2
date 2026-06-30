// e2e test: workout summary screen after finish (w2b fidelity-2)

import { test, expect } from '@playwright/test';
import { mockAuthSession } from './auth-helpers';

test.describe('Workout summary screen', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);
    await page.goto('/workout/active');
  });

  test('finish workout → summary appears → Done redirects to /workout', async ({ page }) => {
    // Wait for workout to auto-start
    await page.waitForTimeout(2000);

    // Add an exercise
    await page.click('text=Add Exercise');
    await page.fill('input[placeholder*="Search exercises"]', 'Bench');
    await page.locator('button:has-text("Barbell Bench Press")').first().click();

    // Add a set and complete it
    await page.click('text=Add Set');
    await page.locator('input[type="number"]').nth(0).fill('80');
    await page.locator('input[type="number"]').nth(1).fill('8');
    await page.click('[title="Complete set"]');

    // Finish workout
    await page.click('text=Finish');

    // Summary screen should appear (not redirect immediately)
    await expect(page.locator('text=Workout Complete')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Duration')).toBeVisible();
    await expect(page.locator('text=kg Vol')).toBeVisible();
    await expect(page.getByText('Exercises', { exact: true })).toBeVisible();
    await expect(page.getByText('Sets', { exact: true })).toBeVisible();

    // AI Coach section should be visible
    await expect(page.locator('text=AI Coach')).toBeVisible();

    // Click Done → redirect to /workout
    await page.click('text=Done');
    await page.waitForURL(/\/workout$/, { timeout: 10000 });
  });

  test('summary shows AI Coach fallback for empty workout', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Finish without adding any exercises
    await page.click('text=Finish');

    // Summary should appear
    await expect(page.locator('text=Workout Complete')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=AI Coach')).toBeVisible();

    // Click Done → redirect to /workout
    await page.click('text=Done');
    await page.waitForURL(/\/workout$/, { timeout: 10000 });
  });
});
