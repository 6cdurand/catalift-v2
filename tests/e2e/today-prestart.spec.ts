// today-prestart.spec.ts — E2E regression for BUG-023: a fixed-day program's
// scheduled dates BEFORE its start_date must never render on the athlete
// Today day strip (no dot, no session), while dates on/after start_date must
// still render (including a genuine past miss with no workout row).
//
// The browser clock is frozen (page.clock.setFixedTime) so the test is
// deterministic regardless of which real-world weekday it runs on: without a
// fixed clock, a scheduled pre-start date must ALSO be in the past relative to
// "today" to trigger the pre-fix "missed" bug, which the real device date
// cannot guarantee on every CI run.

import { addDays, format, startOfWeek } from 'date-fns';
import { test, expect, type Route } from '@playwright/test';
import { mockAuthSession } from './auth-helpers';

const SUPABASE_REF = 'igagmdkdzjkxrwnyvgqk';
const SUPABASE_URL = `https://${SUPABASE_REF}.supabase.co`;
const CLIENT_ID = 'test-user-id'; // matches auth-helpers fakeUser.id

function iso(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

// Anchor week (weeks start Monday, per src/lib/week.ts). The literal anchor
// date is arbitrary — only the derived weekday offsets matter.
const WEEK_START = startOfWeek(new Date(2026, 0, 1), { weekStartsOn: 1 });
const TUESDAY = addDays(WEEK_START, 1); // pre-start, scheduled
const WEDNESDAY = addDays(WEEK_START, 2); // program start_date
const THURSDAY = addDays(WEEK_START, 3); // on/after start, scheduled
const FRIDAY = addDays(WEEK_START, 4); // frozen "now" — after both Tue and Thu
const FROZEN_NOW = new Date(
  FRIDAY.getFullYear(),
  FRIDAY.getMonth(),
  FRIDAY.getDate(),
  9,
  0,
  0,
);

const TUESDAY_ISO = iso(TUESDAY);
const START_DATE_ISO = iso(WEDNESDAY);
const THURSDAY_ISO = iso(THURSDAY);

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

function clientProgramRow() {
  return {
    id: 'prog-bug023-e2e',
    trainer_id: 'trainer-bug023-e2e',
    client_id: CLIENT_ID,
    name: 'BUG-023 Fixture Program',
    status: 'active',
    start_date: START_DATE_ISO, // Postgres `date` -> bare "YYYY-MM-DD"
    end_date: null,
    next_workout_index: 0,
    program_data: {
      goal: 'hypertrophy',
      phase: 'hypertrophy',
      weeklyPlan: [
        { id: 'd0', label: 'Push', scheduledDay: 'tuesday', blocks: [] },
        { id: 'd1', label: 'Legs', scheduledDay: 'thursday', blocks: [] },
      ],
      scheduleMode: 'fixed',
      trainingDaysPerWeek: 2,
      selectedDays: ['tuesday', 'thursday'],
      cycleAcrossWeeks: true,
      sessionPTMap: {},
      autoRepeat: false,
    },
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

test.describe('Today — pre-start dates are never "Missed" (BUG-023)', () => {
  test('day strip omits the pre-start Tuesday and still renders the post-start Thursday', async ({
    page,
  }) => {
    await mockAuthSession(page);

    await page.route(`${SUPABASE_URL}/rest/v1/client_programs*`, (route) =>
      json(route, [clientProgramRow()]),
    );

    // Freeze the clock BEFORE navigation so every `new Date()` in the app
    // (deviceToday, getWeekWindow, getNextProgramWorkout) sees the same
    // instant. Timers keep running (setFixedTime, not install), so React and
    // Next.js behave normally.
    await page.clock.setFixedTime(FROZEN_NOW);

    await page.goto('/today');
    await expect(
      page.getByTestId('app-header').getByRole('heading', { name: 'Today', exact: true }),
    ).toBeVisible();

    // Pre-start Tuesday: no dot on the day strip (existing testid).
    await expect(page.getByTestId(`day-dot-${TUESDAY_ISO}`)).toHaveCount(0);
    // Post-start Thursday: still has its dot.
    await expect(page.getByTestId(`day-dot-${THURSDAY_ISO}`)).toHaveCount(1);

    // Drill into Tuesday — must show the rest-day empty state, no session card.
    await page.getByRole('button', { name: /^Tuesday/ }).click();
    await expect(page.getByTestId('today-session-card')).toHaveCount(0);
    await expect(page.getByText(/rest day/i)).toBeVisible();

    // Drill into Thursday — a genuine past miss (no workout row) must still render.
    await page.getByRole('button', { name: /^Thursday/ }).click();
    await expect(page.getByTestId('today-session-card')).toHaveCount(1);
    await expect(page.getByTestId('today-session-card')).toContainText(/missed/i);
  });
});
