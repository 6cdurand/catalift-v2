// booking-visibility.spec.ts — E2E for P-08 (render calendar_events into the
// UI). This is the read half of the booking lane P-02 shipped without a
// reader — see the P-08 brief §1. Specifically closes the gap book-client.spec.ts
// documented as "NOT covered here": a booked session must actually appear on
// the trainer's own schedule surfaces, with its time, and survive a hard
// refresh — and the same booking must be visible to the client it was booked
// with.
//
// The write half (POST to calendar_events) is P-02's job and already
// covered by book-client.spec.ts. This spec seeds the READ side directly
// (a GET calendar_events fixture, as if P-02's write had already landed)
// and asserts the render — that is the entirety of P-08's scope.

import { test, expect, type Page, type Route } from '@playwright/test';
import { mockAuthSession } from './auth-helpers';

const SUPABASE_REF = 'igagmdkdzjkxrwnyvgqk';
const SUPABASE_URL = `https://${SUPABASE_REF}.supabase.co`;
const TRAINER_ID = 'test-user-id'; // fixed identity minted by mockAuthSession
const CLIENT_ID = 'client-1';

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

/** A booked `calendar_events` row, shaped as `rowToCalendarEvent` reads it. */
function bookedEventRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'evt-booked-1',
    title: 'PT Session with John Doe',
    type: 'session',
    date: todayISO(),
    start_time: '17:00',
    end_time: '18:00',
    duration: 60,
    client_id: CLIENT_ID,
    trainer_id: TRAINER_ID,
    owner_user_id: null,
    event_scope: 'shared_session',
    status: 'scheduled',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

async function mockTrainerSurfaces(page: Page, events: unknown[]) {
  await mockAuthSession(page);

  await page.route(`${SUPABASE_URL}/rest/v1/users*`, (route) =>
    json(route, { role: 'trainer' }),
  );

  await page.route(`${SUPABASE_URL}/rest/v1/trainer_clients*`, (route) =>
    json(route, [
      {
        id: 'tc-1',
        client_id: CLIENT_ID,
        status: 'active',
        client: {
          id: CLIENT_ID,
          full_name: 'John Doe',
          email: 'john@example.com',
          avatar_url: null,
        },
      },
    ]),
  );

  // No programs — this booking is a template booking (Trap §4's other,
  // non-colliding case), so the trainer's schedule is booking-only.
  await page.route(`${SUPABASE_URL}/rest/v1/client_programs*`, (route) =>
    json(route, []),
  );
  await page.route(`${SUPABASE_URL}/rest/v1/workouts*`, (route) => json(route, []));
  await page.route(`${SUPABASE_URL}/rest/v1/client_sessions*`, (route) =>
    json(route, []),
  );

  // The read half under test: listVisibleCalendarEvents -> GET calendar_events.
  await page.route(`${SUPABASE_URL}/rest/v1/calendar_events*`, (route) => {
    if (route.request().method() === 'GET') return json(route, events);
    return json(route, []);
  });
}

test.describe('Booking visibility (P-08)', () => {
  test('a booked session appears on the trainer Today schedule with its time', async ({
    page,
  }) => {
    await mockTrainerSurfaces(page, [bookedEventRow()]);

    await page.goto('/today');

    await expect(page.getByTestId('trainer-day-strip')).toBeVisible();
    const row = page.getByTestId('trainer-session-row').first();
    await expect(row).toBeVisible();
    await expect(row).toContainText('17:00');
    await expect(row).toContainText('John Doe');

    // Survives a hard refresh — the row is server-of-record data (a real
    // calendar_events read), not local booking state.
    await page.reload();
    await expect(page.getByTestId('trainer-session-row').first()).toContainText(
      '17:00',
    );
  });

  test('the same booked session appears on the trainer /calendar day view, positioned at its time', async ({
    page,
  }) => {
    await mockTrainerSurfaces(page, [bookedEventRow()]);

    await page.goto('/calendar');
    await page.getByLabel('Day view').click();

    // The booking hour row (17:00) carries the booking chip; a neighbouring
    // hour does not.
    const bookedHour = page.locator('[data-hour="17"]');
    await expect(bookedHour.locator('[data-booking-chip]')).toBeVisible();
    await expect(
      page.locator('[data-hour="9"]').locator('[data-booking-chip]'),
    ).toHaveCount(0);
  });

  test('the booking is visible to the client on their own calendar', async ({
    page,
  }) => {
    await mockAuthSession(page); // default role: client, id: test-user-id

    // The client's own id must match `client_id` on the row for
    // `getVisibleCalendarEvents` (mode: "user") to surface it.
    const event = bookedEventRow({ client_id: TRAINER_ID, trainer_id: 'trainer-x' });

    await page.route(`${SUPABASE_URL}/rest/v1/client_programs*`, (route) =>
      json(route, []),
    );
    await page.route(`${SUPABASE_URL}/rest/v1/workouts*`, (route) => json(route, []));
    await page.route(`${SUPABASE_URL}/rest/v1/calendar_events*`, (route) => {
      if (route.request().method() === 'GET') return json(route, [event]);
      return json(route, []);
    });

    await page.goto('/calendar');
    await page.getByLabel('Day view').click();

    await expect(
      page.locator('[data-hour="17"]').locator('[data-booking-chip]'),
    ).toBeVisible();
  });
});
