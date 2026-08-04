// calendar-views.spec.ts — E2E smoke for the calendar month/week/day toggle
// (A2 / P-01). Before this fix, Week/Day were disabled ("coming soon"); once
// enabled, clicking them set state that nothing rendered differently — a dead
// control. These tests are the regression lock: the toggle must actually
// swap the rendered grid, not just change internal state.

import { test, expect, type Page, type Route } from '@playwright/test';
import { mockAuthSession } from './auth-helpers';

const SUPABASE_REF = 'igagmdkdzjkxrwnyvgqk';
const SUPABASE_URL = `https://${SUPABASE_REF}.supabase.co`;

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

/**
 * A fixed-mode program with Mon/Wed/Fri sessions. Fixed mode (rather than
 * flexible) guarantees `buildScheduledSessions` populates every scheduled
 * weekday across the visible range regardless of which real-world weekday
 * the suite happens to run on.
 */
function programFixture() {
  return {
    id: 'prog-1',
    trainer_id: 'trainer-1',
    client_id: 'test-user-id',
    name: 'Test Program',
    status: 'active',
    next_workout_index: 0,
    start_date: '2026-01-01',
    end_date: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    program_data: {
      goal: 'general_fitness',
      phase: 'none',
      weeklyPlan: [
        { id: 'd0', label: 'Push Day', scheduledDay: 'monday', blocks: [] },
        { id: 'd1', label: 'Pull Day', scheduledDay: 'wednesday', blocks: [] },
        { id: 'd2', label: 'Legs Day', scheduledDay: 'friday', blocks: [] },
      ],
      scheduleMode: 'fixed',
      trainingDaysPerWeek: 3,
      selectedDays: ['monday', 'wednesday', 'friday'],
      cycleAcrossWeeks: false,
      sessionPTMap: {},
      autoRepeat: true,
    },
  };
}

async function mockCalendar(page: Page) {
  await mockAuthSession(page);

  await page.route(`${SUPABASE_URL}/rest/v1/client_programs*`, (route) =>
    json(route, [programFixture()]),
  );
}

test.describe('Calendar — month/week/day toggle (A2 / P-01)', () => {
  test('toggle actually switches the rendered grid: month → week → day → month', async ({
    page,
  }) => {
    await mockCalendar(page);
    await page.goto('/calendar');

    await expect(page.locator('[data-slot="month-grid"]')).toBeVisible();
    await expect(page.locator('[data-slot="week-grid"]')).toHaveCount(0);
    await expect(page.locator('[data-slot="day-grid"]')).toHaveCount(0);

    await page.getByLabel('Week view').click();
    await expect(page.locator('[data-slot="week-grid"]')).toBeVisible();
    await expect(page.locator('[data-slot="month-grid"]')).toHaveCount(0);
    await expect(page.locator('[data-slot="day-grid"]')).toHaveCount(0);

    await page.getByLabel('Day view').click();
    await expect(page.locator('[data-slot="day-grid"]')).toBeVisible();
    await expect(page.locator('[data-slot="month-grid"]')).toHaveCount(0);
    await expect(page.locator('[data-slot="week-grid"]')).toHaveCount(0);

    await page.getByLabel('Month view').click();
    await expect(page.locator('[data-slot="month-grid"]')).toBeVisible();
    await expect(page.locator('[data-slot="week-grid"]')).toHaveCount(0);
    await expect(page.locator('[data-slot="day-grid"]')).toHaveCount(0);
  });

  test('week view renders a 7-day header + hour grid, structurally distinct from month', async ({
    page,
  }) => {
    await mockCalendar(page);
    await page.goto('/calendar');

    await page.getByLabel('Week view').click();
    await expect(page.locator('[data-week-date]')).toHaveCount(7);
    await expect(page.locator('[data-hour]')).toHaveCount(14);
  });

  test('day view renders a single day + hour grid, structurally distinct from week', async ({
    page,
  }) => {
    await mockCalendar(page);
    await page.goto('/calendar');

    await page.getByLabel('Day view').click();
    await expect(page.locator('[data-week-date]')).toHaveCount(0);
    await expect(page.locator('[data-slot="day-grid"]')).toHaveAttribute(
      'data-date',
      /^\d{4}-\d{2}-\d{2}$/,
    );
    await expect(page.locator('[data-hour]')).toHaveCount(14);
  });

  test('empty-slot click in day/week view does not throw or navigate (no-op until A1 wires Add Event)', async ({
    page,
  }) => {
    await mockCalendar(page);
    await page.goto('/calendar');

    await page.getByLabel('Day view').click();
    await page.locator('[data-hour="9"]').click();
    await expect(page).toHaveURL(/\/calendar$/);
    await expect(page.locator('[data-slot="day-grid"]')).toBeVisible();

    await page.getByLabel('Week view').click();
    await page.locator('[data-hour="9"]').first().click();
    await expect(page).toHaveURL(/\/calendar$/);
    await expect(page.locator('[data-slot="week-grid"]')).toBeVisible();
  });

  // v2 does not persist view-mode (no localStorage key, out of A2's write-set)
  // — a hard refresh always lands back on month. Asserting that explicitly
  // per the brief's instruction to state this rather than invent persistence.
  test('hard refresh resets the view to month (view-mode is not persisted)', async ({
    page,
  }) => {
    await mockCalendar(page);
    await page.goto('/calendar');

    await page.getByLabel('Week view').click();
    await expect(page.locator('[data-slot="week-grid"]')).toBeVisible();

    await page.reload();
    await expect(page.locator('[data-slot="month-grid"]')).toBeVisible();
  });
});
