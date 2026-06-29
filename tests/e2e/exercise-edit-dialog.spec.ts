import { test, expect } from '@playwright/test';
import { mockAuthSession } from './auth-helpers';

const SUPABASE_REF = 'igagmdkdzjkxrwnyvgqk';

test.describe('Exercise Edit Dialog (w2b-2)', () => {
  test('open exercise → change set-style + rest + tempo + note → Save → values persist', async ({
    page,
  }) => {
    await mockAuthSession(page);

    // Mock saved_programs fetch (empty) so the builder doesn't hang
    await page.route(
      `https://${SUPABASE_REF}.supabase.co/rest/v1/saved_programs*`,
      async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          });
          return;
        }
        await route.continue();
      },
    );

    // Navigate to builder
    await page.goto('/program/builder');

    // Step 1: Setup — fill program name and continue
    await expect(page.getByLabel('Program Name')).toBeVisible();
    await page.getByLabel('Program Name').fill('Test Program');
    await page.getByRole('button', { name: 'Continue to Build Days' }).click();

    // Step 2: Build Days — add a block
    await expect(page.getByText('Add Block:')).toBeVisible();
    await page.getByRole('button', { name: /Strength/ }).click();

    // Add an exercise to the block
    await page.getByRole('button', { name: /Add Exercise/ }).click();
    await expect(page.getByRole('heading', { name: 'Add Exercise' })).toBeVisible();
    await page.getByPlaceholder('Search exercises').fill('bench');
    // Click the search result button (not the exercise row text)
    await page.getByRole('button', { name: 'Barbell Bench Press compound', exact: true }).click();

    // Wait for Add Exercise dialog to close
    await expect(page.getByRole('heading', { name: 'Add Exercise' })).toBeHidden();

    // Verify the exercise was added in the block
    await expect(page.locator('span.text-sm.font-medium').filter({ hasText: 'Barbell Bench Press' })).toBeVisible();

    // Click the edit (pencil) button on the exercise row
    await page.getByTitle('Edit exercise').click();

    // Dialog should open — wait for the exercise name to appear in the dialog
    await expect(page.getByRole('heading', { name: 'Edit Exercise' })).toBeVisible();

    // Change set style to 5x5
    await page.getByRole('button', { name: /5×5/ }).click();

    // Change rest to 3min
    await page.getByRole('button', { name: '3min', exact: true }).click();

    // Add tempo preset — "Normal"
    await page.getByRole('button', { name: 'Normal', exact: true }).click();

    // Add coaching notes
    await page
      .getByPlaceholder('Any coaching cues for this exercise...')
      .fill('Keep elbows tucked');

    // Save
    await page.getByRole('button', { name: /Save Changes/ }).click();

    // Dialog should close
    await expect(page.getByRole('heading', { name: 'Edit Exercise' })).toBeHidden();

    // Reopen the edit dialog to verify persisted values
    await page.getByTitle('Edit exercise').click();
    await expect(page.getByRole('heading', { name: 'Edit Exercise' })).toBeVisible();

    // Verify sets shows 5
    const setsInput = page.getByLabel('Sets');
    await expect(setsInput).toHaveValue('5');

    // Verify coaching notes persisted
    const notesField = page.getByPlaceholder('Any coaching cues for this exercise...');
    await expect(notesField).toHaveValue('Keep elbows tucked');

    // Close without saving (press Escape)
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'Edit Exercise' })).toBeHidden();
  });
});
