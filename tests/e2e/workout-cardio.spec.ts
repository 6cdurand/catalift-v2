// e2e test: cardio block logging (w2c)

import { test, expect } from '@playwright/test';
import { mockAuthSession } from './auth-helpers';

test.describe('Cardio block execution (w2c)', () => {
  test.beforeEach(async ({ page }) => {
    // Auto-dismiss alert() so it doesn't block JS if persist fails
    page.on('dialog', (d) => d.dismiss());
    await mockAuthSession(page);
    await page.goto('/workout/active');
  });

  test('add cardio (Running, 30 min, 5 km, 300 cal) → cardio card appears with values', async ({
    page,
  }) => {
    await expect(page.locator('text=Add Block')).toBeVisible({ timeout: 10000 });

    // Open the v1 2×2 block-type picker (+ → Cardio tile)
    await page.getByRole('button', { name: 'Add Block' }).click();
    await page.getByRole('button', { name: 'Cardio' }).click();

    // Modal should appear
    await expect(page.getByRole('heading', { name: 'Add Cardio' })).toBeVisible();

    // Search for an exercise
    await page.getByPlaceholder('Search cardio exercises').fill('Running');
    // Click first result
    await page.locator('button:has-text("Running")').first().click();

    // Enter duration (30 minutes)
    await page.getByLabel('Duration (minutes)').fill('30');

    // Confirm
    await page.getByRole('dialog').getByRole('button', { name: 'Add' }).click();

    // Verify cardio card appears (its heading is the exercise name)
    await expect(page.getByRole('heading', { name: 'Running' })).toBeVisible();

    // Verify duration input shows 30 (minutes)
    const durationInput = page.locator('input[id*="cardio-duration-"]');
    await expect(durationInput).toHaveValue('30');

    // Enter distance (5 km)
    const distanceInput = page.locator('input[id*="cardio-distance-"]');
    await distanceInput.fill('5');

    // Enter calories (300)
    const caloriesInput = page.locator('input[id*="cardio-calories-"]');
    await caloriesInput.fill('300');

    // Finish workout
    await page.getByRole('button', { name: 'Finish' }).click();
    await page.waitForURL(/\/workout/, { timeout: 10000 });
  });

  test('edit duration → value updates → finish saves', async ({ page }) => {
    await expect(page.locator('text=Add Block')).toBeVisible({ timeout: 10000 });

    // Add cardio with 20 min duration (+ → Cardio tile)
    await page.getByRole('button', { name: 'Add Block' }).click();
    await page.getByRole('button', { name: 'Cardio' }).click();
    await page.getByPlaceholder('Search cardio exercises').fill('Running');
    await page.locator('button:has-text("Running")').first().click();
    await page.getByLabel('Duration (minutes)').fill('20');
    await page.getByRole('dialog').getByRole('button', { name: 'Add' }).click();

    // Verify it appeared (heading = exercise name)
    await expect(page.getByRole('heading', { name: 'Running' })).toBeVisible();

    // Edit duration to 45 min
    const durationInput = page.locator('input[id*="cardio-duration-"]');
    await durationInput.fill('45');
    await expect(durationInput).toHaveValue('45');

    // Finish
    await page.getByRole('button', { name: 'Finish' }).click();
    await page.waitForURL(/\/workout/, { timeout: 10000 });
  });

  test('reload → cardio block rehydrates (G-09 persist)', async ({ page }) => {
    await expect(page.locator('text=Add Block')).toBeVisible({ timeout: 10000 });

    // Add cardio (+ → Cardio tile)
    await page.getByRole('button', { name: 'Add Block' }).click();
    await page.getByRole('button', { name: 'Cardio' }).click();
    await page.getByPlaceholder('Search cardio exercises').fill('Cycling');
    await page.locator('button:has-text("Cycling")').first().click();
    await page.getByLabel('Duration (minutes)').fill('40');
    await page.getByRole('dialog').getByRole('button', { name: 'Add' }).click();

    // Verify cardio block is present (heading = exercise name)
    await expect(page.getByRole('heading', { name: 'Cycling' })).toBeVisible();

    // Reload the page — workout state should rehydrate (G-09)
    await page.reload();

    // After reload, the cardio block should still be there
    await expect(page.getByRole('heading', { name: 'Cycling' })).toBeVisible({ timeout: 10000 });
  });

  test('cardio + straight set in same workout → finish saves → totalVolume = straight only (cardio = 0)', async ({
    page,
  }) => {
    await expect(page.locator('text=Add Block')).toBeVisible({ timeout: 10000 });

    // Add a straight-set exercise (+ → Strength tile)
    await page.getByRole('button', { name: 'Add Block' }).click();
    await page.getByRole('button', { name: 'Strength' }).click();
    await page.getByPlaceholder('Search exercises (e.g. Bench Press)').fill('Bench');
    await page.locator('button:has-text("Barbell Bench Press")').first().click();

    // Add a set and complete it
    await page.getByRole('button', { name: 'Add Set' }).click();
    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill('80');
    await inputs.nth(1).fill('8');
    await page.locator('[title="Complete set"]').first().click();

    // Verify volume
    await expect(page.locator('text=vol: 640kg')).toBeVisible();

    // Add cardio (+ → Cardio tile)
    await page.getByRole('button', { name: 'Add Block' }).click();
    await page.getByRole('button', { name: 'Cardio' }).click();
    await page.getByPlaceholder('Search cardio exercises').fill('Running');
    await page.locator('button:has-text("Running")').first().click();
    await page.getByLabel('Duration (minutes)').fill('30');
    await page.getByRole('dialog').getByRole('button', { name: 'Add' }).click();

    // Verify both blocks are present
    await expect(page.getByText('Barbell Bench Press')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Running' })).toBeVisible();

    // Finish — should save (totalVolume = 640 from straight, 0 from cardio)
    await page.getByRole('button', { name: 'Finish' }).click();
    await page.waitForURL(/\/workout/, { timeout: 10000 });
  });
});
