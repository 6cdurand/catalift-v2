// e2e test: in-session drop-set add (faithful v1 port, BACKLOG #19 AC #1).
// A user can visually add a drop set to an exercise; it renders as a shaded sub-row,
// is editable, and persists across reload (G-09).

import { test, expect } from '@playwright/test';
import { mockAuthSession } from './auth-helpers';

test.describe('Drop-set execution (faithful v1 port)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', (d) => d.dismiss());
    await mockAuthSession(page);
    await page.goto('/workout/active');
  });

  test('add a drop set to an exercise → it renders, is editable, and persists across reload', async ({
    page,
  }) => {
    await expect(page.locator('text=Add Block')).toBeVisible({ timeout: 10000 });

    // Add a strength exercise (+ → Strength tile)
    await page.getByRole('button', { name: 'Add Block' }).click();
    await page.getByRole('button', { name: 'Strength' }).click();
    await page.getByPlaceholder('Search exercises').fill('Bench');
    await page.locator('button:has-text("Barbell Bench Press")').first().click();

    // Add a working set with weight/reps
    await page.getByRole('button', { name: 'Add Set' }).click();
    await page.locator('input[type="number"]').nth(0).fill('100');
    await page.locator('input[type="number"]').nth(1).fill('5');

    // Add a drop set from the exercise actions menu (v1 handleAddDropSet :1322)
    await page.getByLabel('Exercise actions').click();
    await page.getByRole('menuitem', { name: 'Add Drop Set' }).click();

    // A shaded drop-set sub-row appears
    await expect(page.getByTestId('drop-set-row')).toHaveCount(1);

    // Fill the drop weight/reps (inputs: [set kg, set reps, drop kg, drop reps])
    await page.locator('input[type="number"]').nth(2).fill('60');
    await page.locator('input[type="number"]').nth(3).fill('8');

    // Reload → workout rehydrates with the drop still present + its value (G-09)
    await page.reload();
    await expect(page.getByTestId('drop-set-row')).toHaveCount(1);
    await expect(page.locator('input[type="number"]').nth(2)).toHaveValue('60');
  });
});
