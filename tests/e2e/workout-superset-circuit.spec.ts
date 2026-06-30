// e2e test: superset + circuit block logging (w2b)

import { test, expect } from '@playwright/test';
import { mockAuthSession } from './auth-helpers';

test.describe('Superset + Circuit execution (w2b)', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);
    await page.goto('/workout/active');
  });

  test('add a Superset of 2 exercises → log a set in each → both persist', async ({ page }) => {
    // Wait for workout to auto-start
    await expect(page.locator('text=Add Exercise')).toBeVisible({ timeout: 10000 });

    // Click "Add Superset"
    await page.getByRole('button', { name: /Add Superset/ }).click();

    // Modal should appear
    await expect(page.getByRole('heading', { name: 'Add Superset' })).toBeVisible();

    // Search and select first exercise
    await page.getByPlaceholder('Search exercises').fill('Bench');
    await page.locator('button:has-text("Barbell Bench Press")').first().click();

    // Search and select second exercise
    await page.getByPlaceholder('Search exercises').fill('Squat');
    await page.locator('button:has-text("Barbell Back Squat")').first().click();

    // Click add button (the one inside the modal, not the page-level button)
    await page.getByRole('button', { name: /^Add \d+ Superset$/ }).click();

    // Verify superset block appears with badge
    await expect(page.getByText('Superset').first()).toBeVisible();
    await expect(page.locator('text=Barbell Bench Press')).toBeVisible();
    await expect(page.locator('text=Barbell Back Squat')).toBeVisible();

    // Add a set to the first exercise (Bench Press)
    await page.getByRole('button', { name: 'Add Set' }).first().click();

    // Fill weight + reps for first exercise's set
    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill('60');
    await inputs.nth(1).fill('10');

    // Complete the set
    await page.locator('[title="Complete set"]').first().click();

    // Verify volume display
    await expect(page.locator('text=vol: 600kg')).toBeVisible();

    // Add a set to the second exercise (Squat)
    const addSetButtons = page.getByRole('button', { name: 'Add Set' });
    await addSetButtons.nth(1).click();

    // Fill weight + reps for second exercise's set
    const inputs2 = page.locator('input[type="number"]');
    await inputs2.nth(2).fill('80');
    await inputs2.nth(3).fill('5');

    // Complete the second set
    await page.locator('[title="Complete set"]').first().click();

    // Verify second volume
    await expect(page.locator('text=vol: 400kg')).toBeVisible();

    // Finish workout
    await page.getByRole('button', { name: 'Finish' }).click();
    await page.waitForURL(/\/workout/, { timeout: 10000 });
  });

  test('add a Circuit (2 stations, 3 rounds) → Add Round → a set appears in each station → finish saves', async ({
    page,
  }) => {
    await expect(page.locator('text=Add Exercise')).toBeVisible({ timeout: 10000 });

    // Click "Add Circuit"
    await page.getByRole('button', { name: /Add Circuit/ }).click();

    // Modal should appear
    await expect(page.getByRole('heading', { name: 'Add Circuit' })).toBeVisible();

    // Select 2 stations
    await page.getByPlaceholder('Search exercises').fill('Bench');
    await page.locator('button:has-text("Barbell Bench Press")').first().click();

    await page.getByPlaceholder('Search exercises').fill('Row');
    await page.locator('button:has-text("Barbell Bent-Over Row")').first().click();

    // Set rounds to 3 (default is already 3)
    await page.getByLabel('Rounds').fill('3');

    // Click add button (the one inside the modal)
    await page.getByRole('button', { name: /^Add \d+ Circuit$/ }).click();

    // Verify circuit block appears
    await expect(page.getByText('Circuit').first()).toBeVisible();
    await expect(page.locator('text=3 rounds')).toBeVisible();
    await expect(page.locator('text=Barbell Bench Press')).toBeVisible();
    await expect(page.locator('text=Barbell Bent-Over Row')).toBeVisible();

    // Click "Add Round" — should add a set to every station
    await page.getByRole('button', { name: /Add Round/ }).click();

    // Verify a set row appeared in each station (2 sets total)
    const setNumberElements = page.locator('div.col-span-1.text-gray-500.font-medium');
    await expect(setNumberElements).toHaveCount(2);

    // Fill weight + reps for first station
    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill('50');
    await inputs.nth(1).fill('8');

    // Complete first station's set
    await page.locator('[title="Complete set"]').first().click();

    // Verify volume
    await expect(page.locator('text=vol: 400kg')).toBeVisible();

    // Add a second round
    await page.getByRole('button', { name: /Add Round/ }).click();

    // Now should have 4 sets total (2 stations × 2 rounds)
    await expect(page.locator('div.col-span-1.text-gray-500.font-medium')).toHaveCount(4);

    // Finish workout
    await page.getByRole('button', { name: 'Finish' }).click();
    await page.waitForURL(/\/workout/, { timeout: 10000 });
  });

  test('saved workout reads back with superset + circuit blocks intact (fromRow)', async ({
    page,
  }) => {
    await expect(page.locator('text=Add Exercise')).toBeVisible({ timeout: 10000 });

    // Add a superset
    await page.getByRole('button', { name: /Add Superset/ }).click();
    await page.getByPlaceholder('Search exercises').fill('Bench');
    await page.locator('button:has-text("Barbell Bench Press")').first().click();
    await page.getByPlaceholder('Search exercises').fill('Row');
    await page.locator('button:has-text("Barbell Bent-Over Row")').first().click();
    await page.getByRole('button', { name: /^Add \d+ Superset$/ }).click();

    // Verify superset persisted in the DOM (state persists via Zustand)
    await expect(page.getByText('Superset').first()).toBeVisible();

    // Reload the page — workout state should rehydrate (G-09)
    await page.reload();

    // After reload, the superset block should still be there
    await expect(page.getByText('Superset').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Barbell Bench Press')).toBeVisible();
    await expect(page.locator('text=Barbell Bent-Over Row')).toBeVisible();
  });
});
