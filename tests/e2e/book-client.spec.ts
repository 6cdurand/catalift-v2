// book-client.spec.ts — E2E smoke for the trainer booking screen (P-02).
//
// Covers the brief's §10 E2E requirements:
//   1. Trainer -> /clients/[id] -> Book -> fill date/time/duration -> submit
//      -> lands back on the client file.
//   2. The write is a real network round-trip to `calendar_events` (not v1's
//      localStorage `BookingRequest` store) — asserted on the intercepted
//      POST body, and a hard refresh of the client file does not depend on
//      any local booking state.
//
// NOT covered here (documented, not silently skipped — tests/AGENTS.md rule
// 4): "the booked session appears on the trainer's /calendar." `/calendar`
// (`useScheduledSessions`) is program-derived only and does not yet query
// `calendar_events` — see `TrainerDaySchedule.tsx`'s own comment ("Phase 1:
// rows are PROGRAM-DERIVED... Times and a Book button arrive with the
// booking lane (Phase 2)"). Wiring `calendar_events` into `/calendar` touches
// a shared feature file outside this brief's write-set and is a separate
// follow-up, not part of P-02.

import { test, expect, type Page, type Route } from '@playwright/test';
import { mockAuthSession } from './auth-helpers';

const SUPABASE_REF = 'igagmdkdzjkxrwnyvgqk';
const SUPABASE_URL = `https://${SUPABASE_REF}.supabase.co`;
const CLIENT_ID = 'client-1';
const TRAINER_ID = 'test-user-id';

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function mockBookingScreen(page: Page) {
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

  await page.route(`${SUPABASE_URL}/rest/v1/workouts*`, (route) =>
    json(route, []),
  );

  // P-06-L1: the client file reads PB count for the header profile card.
  await page.route(`${SUPABASE_URL}/rest/v1/personal_bests*`, (route) =>
    json(route, []),
  );

  // No active program — the booking screen falls back to the Template mode.
  await page.route(`${SUPABASE_URL}/rest/v1/client_programs*`, (route) =>
    json(route, []),
  );

  await page.route(`${SUPABASE_URL}/rest/v1/calendar_events*`, async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      await json(route, [{ ...body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }], 201);
      return;
    }
    await json(route, []);
  });
}

test.describe('Book a client (P-02)', () => {
  test('trainer books a session and lands back on the client file', async ({ page }) => {
    await mockBookingScreen(page);

    let capturedBody: Record<string, unknown> | null = null;
    await page.route(`${SUPABASE_URL}/rest/v1/calendar_events*`, async (route) => {
      if (route.request().method() === 'POST') {
        capturedBody = route.request().postDataJSON();
        await json(route, [{ ...capturedBody }], 201);
        return;
      }
      await json(route, []);
    });

    await page.goto(`http://localhost:3000/clients/${CLIENT_ID}`);
    await expect(page.getByRole('heading', { name: 'John Doe' })).toBeVisible();

    await page.getByTestId('quick-action-book').click();
    await expect(page).toHaveURL(new RegExp(`/clients/${CLIENT_ID}/book$`));

    // Pick a time slot and duration, leave the rest at defaults (pt_session /
    // template mode, since no active program is mocked).
    await page.getByRole('button', { name: '09:30', exact: true }).click();
    await page.getByPlaceholder('e.g., Catalift Hamilton').fill('Catalift Hamilton');

    await page.getByRole('button', { name: /send booking request/i }).click();

    await expect(page).toHaveURL(new RegExp(`/clients/${CLIENT_ID}$`));
    await expect(page.getByRole('heading', { name: 'John Doe' })).toBeVisible();

    // The write is a real Supabase REST call (calendar_events_single_source_ck
    // guard: exactly one of program_id/template_slug, never both).
    expect(capturedBody).not.toBeNull();
    expect(capturedBody!.client_id).toBe(CLIENT_ID);
    expect(capturedBody!.trainer_id).toBe(TRAINER_ID);
    expect(capturedBody!.type).toBe('session'); // pt_session -> session, never pt_session
    expect(capturedBody!.start_time).toBe('09:30');
    expect(capturedBody!.location).toBe('Catalift Hamilton');
    expect(capturedBody!.program_id == null || capturedBody!.template_slug == null).toBe(true);
  });

  test('hard refresh: the client file does not depend on any local booking state', async ({
    page,
  }) => {
    await mockBookingScreen(page);

    await page.goto(`http://localhost:3000/clients/${CLIENT_ID}`);
    await page.getByTestId('quick-action-book').click();
    await expect(page).toHaveURL(new RegExp(`/clients/${CLIENT_ID}/book$`));

    await page.getByRole('button', { name: /send booking request/i }).click();
    await expect(page).toHaveURL(new RegExp(`/clients/${CLIENT_ID}$`));

    // v1 wrote the booking to a localStorage Zustand store; v2 writes ONE
    // `calendar_events` row via a real Supabase call. Assert no booking-shaped
    // key ever lands in localStorage.
    const localStorageKeys = await page.evaluate(() => Object.keys(localStorage));
    expect(localStorageKeys.some((k) => k.toLowerCase().includes('booking'))).toBe(false);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'John Doe' })).toBeVisible();
  });

  test('submit is disabled while the booking is in flight', async ({ page }) => {
    await mockBookingScreen(page);

    // Delay the POST response so the disabled state is observable.
    await page.route(`${SUPABASE_URL}/rest/v1/calendar_events*`, async (route) => {
      if (route.request().method() === 'POST') {
        await new Promise((r) => setTimeout(r, 500));
        await json(route, [route.request().postDataJSON()], 201);
        return;
      }
      await json(route, []);
    });

    await page.goto(`http://localhost:3000/clients/${CLIENT_ID}/book`);
    const submit = page.getByRole('button', { name: /send booking request/i });
    await submit.click();

    await expect(page.getByRole('button', { name: /creating/i })).toBeDisabled();
  });
});
