# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workout-superset-circuit.spec.ts >> Superset + Circuit execution (w2b) >> add a Superset of 2 exercises → log a set in each → both persist
- Location: tests/e2e/workout-superset-circuit.spec.ts:12:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /Add Superset/ })
    - waiting for" http://localhost:3000/workout/active" navigation to finish...
    - navigated to "http://localhost:3000/workout/active"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - paragraph [ref=e6]: Workout
        - paragraph [ref=e7]: 0:26
      - button "Finish" [ref=e8]
    - button "Add Exercise" [ref=e10]:
      - img
      - text: Add Exercise
  - button "Open Next.js Dev Tools" [ref=e16] [cursor=pointer]:
    - img [ref=e17]
  - alert [ref=e20]
```

# Test source

```ts
  1   | // e2e test: superset + circuit block logging (w2b)
  2   | 
  3   | import { test, expect } from '@playwright/test';
  4   | import { mockAuthSession } from './auth-helpers';
  5   | 
  6   | test.describe('Superset + Circuit execution (w2b)', () => {
  7   |   test.beforeEach(async ({ page }) => {
  8   |     await mockAuthSession(page);
  9   |     await page.goto('/workout/active');
  10  |   });
  11  | 
  12  |   test('add a Superset of 2 exercises → log a set in each → both persist', async ({ page }) => {
  13  |     // Wait for workout to auto-start
  14  |     await expect(page.locator('text=Add Exercise')).toBeVisible({ timeout: 10000 });
  15  | 
  16  |     // Click "Add Superset"
> 17  |     await page.getByRole('button', { name: /Add Superset/ }).click();
      |                                                              ^ Error: locator.click: Test timeout of 30000ms exceeded.
  18  | 
  19  |     // Modal should appear
  20  |     await expect(page.getByRole('heading', { name: 'Add Superset' })).toBeVisible();
  21  | 
  22  |     // Search and select first exercise
  23  |     await page.getByPlaceholder('Search exercises').fill('Bench');
  24  |     await page.locator('button:has-text("Barbell Bench Press")').first().click();
  25  | 
  26  |     // Search and select second exercise
  27  |     await page.getByPlaceholder('Search exercises').fill('Squat');
  28  |     await page.locator('button:has-text("Barbell Back Squat")').first().click();
  29  | 
  30  |     // Click add button (the one inside the modal, not the page-level button)
  31  |     await page.getByRole('button', { name: /^Add \d+ Superset$/ }).click();
  32  | 
  33  |     // Verify superset block appears with badge
  34  |     await expect(page.getByText('Superset').first()).toBeVisible();
  35  |     await expect(page.locator('text=Barbell Bench Press')).toBeVisible();
  36  |     await expect(page.locator('text=Barbell Back Squat')).toBeVisible();
  37  | 
  38  |     // Add a set to the first exercise (Bench Press)
  39  |     await page.getByRole('button', { name: 'Add Set' }).first().click();
  40  | 
  41  |     // Fill weight + reps for first exercise's set
  42  |     const inputs = page.locator('input[type="number"]');
  43  |     await inputs.nth(0).fill('60');
  44  |     await inputs.nth(1).fill('10');
  45  | 
  46  |     // Complete the set
  47  |     await page.locator('[title="Complete set"]').first().click();
  48  | 
  49  |     // Verify volume display
  50  |     await expect(page.locator('text=vol: 600kg')).toBeVisible();
  51  | 
  52  |     // Add a set to the second exercise (Squat)
  53  |     const addSetButtons = page.getByRole('button', { name: 'Add Set' });
  54  |     await addSetButtons.nth(1).click();
  55  | 
  56  |     // Fill weight + reps for second exercise's set
  57  |     const inputs2 = page.locator('input[type="number"]');
  58  |     await inputs2.nth(2).fill('80');
  59  |     await inputs2.nth(3).fill('5');
  60  | 
  61  |     // Complete the second set
  62  |     await page.locator('[title="Complete set"]').first().click();
  63  | 
  64  |     // Verify second volume
  65  |     await expect(page.locator('text=vol: 400kg')).toBeVisible();
  66  | 
  67  |     // Finish workout
  68  |     await page.getByRole('button', { name: 'Finish' }).click();
  69  |     await page.waitForURL(/\/workout$/, { timeout: 10000 });
  70  |   });
  71  | 
  72  |   test('add a Circuit (2 stations, 3 rounds) → Add Round → a set appears in each station → finish saves', async ({
  73  |     page,
  74  |   }) => {
  75  |     await expect(page.locator('text=Add Exercise')).toBeVisible({ timeout: 10000 });
  76  | 
  77  |     // Click "Add Circuit"
  78  |     await page.getByRole('button', { name: /Add Circuit/ }).click();
  79  | 
  80  |     // Modal should appear
  81  |     await expect(page.getByRole('heading', { name: 'Add Circuit' })).toBeVisible();
  82  | 
  83  |     // Select 2 stations
  84  |     await page.getByPlaceholder('Search exercises').fill('Bench');
  85  |     await page.locator('button:has-text("Barbell Bench Press")').first().click();
  86  | 
  87  |     await page.getByPlaceholder('Search exercises').fill('Row');
  88  |     await page.locator('button:has-text("Barbell Bent-Over Row")').first().click();
  89  | 
  90  |     // Set rounds to 3 (default is already 3)
  91  |     await page.getByLabel('Rounds').fill('3');
  92  | 
  93  |     // Click add button (the one inside the modal)
  94  |     await page.getByRole('button', { name: /^Add \d+ Circuit$/ }).click();
  95  | 
  96  |     // Verify circuit block appears
  97  |     await expect(page.getByText('Circuit').first()).toBeVisible();
  98  |     await expect(page.locator('text=3 rounds')).toBeVisible();
  99  |     await expect(page.locator('text=Barbell Bench Press')).toBeVisible();
  100 |     await expect(page.locator('text=Barbell Bent-Over Row')).toBeVisible();
  101 | 
  102 |     // Click "Add Round" — should add a set to every station
  103 |     await page.getByRole('button', { name: /Add Round/ }).click();
  104 | 
  105 |     // Verify a set row appeared in each station (2 sets total)
  106 |     const setNumberElements = page.locator('div.col-span-1.text-gray-500.font-medium');
  107 |     await expect(setNumberElements).toHaveCount(2);
  108 | 
  109 |     // Fill weight + reps for first station
  110 |     const inputs = page.locator('input[type="number"]');
  111 |     await inputs.nth(0).fill('50');
  112 |     await inputs.nth(1).fill('8');
  113 | 
  114 |     // Complete first station's set
  115 |     await page.locator('[title="Complete set"]').first().click();
  116 | 
  117 |     // Verify volume
```