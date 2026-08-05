// booking-completion.spec.ts — E2E for P-09 (a completed booking must not
// render as "missed").
//
// The reported bug: a trainer marks a booked session complete, and the next day
// it comes back as "missed". Cause — nothing set `calendar_events.status`, and
// `deriveBookingStatus` reads only that column, so `date < today` won.
//
// THE EVENT IS BACK-DATED BY A WEEK ON PURPOSE. A spec that only covers a
// session on today's date never enters the `date < today` branch and therefore
// proves nothing about this bug. One week back also makes navigation exact:
// the trainer day strip's "Previous week" moves the selection by exactly -7
// days, and /calendar's day view steps one day at a time.
//
// The RPC is intercepted rather than executed: migration 00018 is Class B and
// is deliberately NOT applied yet. What this spec proves is the client
// contract (one RPC with the event id, no client-side ledger insert) and the
// render that follows from the server state it produces.

import { test, expect, type Page, type Route } from '@playwright/test';
import { mockAuthSession } from './auth-helpers';

const SUPABASE_REF = 'igagmdkdzjkxrwnyvgqk';
const SUPABASE_URL = `https://${SUPABASE_REF}.supabase.co`;
const TRAINER_ID = 'test-user-id'; // fixed identity minted by mockAuthSession
const CLIENT_ID = 'client-1';
const EVENT_ID = 'evt-booked-past';
const DAYS_BACK = 7;

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const BACK_DATE = isoDaysAgo(DAYS_BACK);

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

/**
 * The server state the surfaces read. `completed` starts false (the bug's
 * starting condition: a past booking still marked 'scheduled') and is flipped
 * by the `complete_calendar_event` RPC, exactly as the real transaction would
 * — status AND ledger row together, never one without the other.
 */
interface ServerState {
  completed: boolean;
  rpcCalls: string[];
  ledgerInserts: number;
}

async function mockTrainerSurfaces(page: Page): Promise<ServerState> {
  const state: ServerState = {
    completed: false,
    rpcCalls: [],
    ledgerInserts: 0,
  };

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

  // Booking-only schedule: no programs, so nothing here is program-derived.
  await page.route(`${SUPABASE_URL}/rest/v1/client_programs*`, (route) =>
    json(route, []),
  );
  await page.route(`${SUPABASE_URL}/rest/v1/workouts*`, (route) => json(route, []));

  await page.route(`${SUPABASE_URL}/rest/v1/client_sessions*`, (route) => {
    if (route.request().method() !== 'GET') {
      // The booking path must never insert the ledger row from the client —
      // that is the RPC's job, in the same transaction as the status flip.
      state.ledgerInserts += 1;
      return json(route, [], 201);
    }
    return json(
      route,
      state.completed
        ? [
            {
              id: 'cs-booked-1',
              trainer_id: TRAINER_ID,
              client_id: CLIENT_ID,
              session_date: BACK_DATE,
              source: 'booking',
              workout_id: null,
              calendar_event_id: EVENT_ID,
              notes: null,
              created_at: new Date().toISOString(),
            },
          ]
        : [],
    );
  });

  await page.route(`${SUPABASE_URL}/rest/v1/calendar_events*`, (route) => {
    if (route.request().method() !== 'GET') return json(route, []);
    return json(route, [
      {
        id: EVENT_ID,
        title: 'PT Session with John Doe',
        type: 'session',
        date: BACK_DATE,
        start_time: '17:00',
        end_time: '18:00',
        duration: 60,
        client_id: CLIENT_ID,
        trainer_id: TRAINER_ID,
        owner_user_id: null,
        event_scope: 'shared_session',
        status: state.completed ? 'completed' : 'scheduled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
  });

  // Migration 00018's RPC: one call, both writes.
  await page.route(
    `${SUPABASE_URL}/rest/v1/rpc/complete_calendar_event`,
    async (route) => {
      const body = route.request().postDataJSON() as { p_event_id: string };
      state.rpcCalls.push(body.p_event_id);
      state.completed = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
    },
  );

  return state;
}

/** Move the trainer day strip back one week — lands exactly on BACK_DATE. */
async function selectBackDatedWeek(page: Page) {
  await expect(page.getByTestId('trainer-day-strip')).toBeVisible();
  await page.getByRole('button', { name: 'Previous week' }).click();
}

test.describe('Completing a booked session (P-09)', () => {
  test('a back-dated booking starts as "missed" and stops being missed once completed — on /today and after a hard refresh', async ({
    page,
  }) => {
    const state = await mockTrainerSurfaces(page);

    await page.goto('/today');
    await selectBackDatedWeek(page);

    // The bug's starting condition, genuinely on the `date < today` branch.
    const row = page.getByTestId('trainer-session-row').first();
    await expect(row).toBeVisible();
    await expect(row).toContainText('Missed');

    await page.getByRole('button', { name: /Mark complete/ }).click();

    // ONE transaction, addressed by the real event id.
    await expect
      .poll(() => state.rpcCalls)
      .toEqual([EVENT_ID]);
    expect(state.ledgerInserts).toBe(0);

    await expect(row).toContainText('Completed');
    await expect(row).not.toContainText('Missed');

    // Survives a hard refresh — this is the "next day it was missed again"
    // symptom: the status must come back from the server, not local state.
    await page.reload();
    await selectBackDatedWeek(page);
    const refreshed = page.getByTestId('trainer-session-row').first();
    await expect(refreshed).toContainText('Completed');
    await expect(refreshed).not.toContainText('Missed');
  });

  test('the same completed booking renders as "Done", not "Missed", on /calendar', async ({
    page,
  }) => {
    const state = await mockTrainerSurfaces(page);

    // Before completion: the past booking is red/"Missed" on the calendar —
    // /calendar has no client_sessions signal at all, so the event's own
    // status column is the ONLY thing that can fix it.
    await page.goto('/calendar');
    await page.getByLabel('Day view').click();
    for (let i = 0; i < DAYS_BACK; i++) {
      await page.getByRole('button', { name: 'Previous day' }).click();
    }
    await expect(page.locator('[data-slot="day-grid"]')).toHaveAttribute(
      'data-date',
      BACK_DATE,
    );
    await expect(
      page.locator('[data-slot="selected-day-list"]').getByText('Missed'),
    ).toBeVisible();

    // Complete it from /today, then come back.
    await page.goto('/today');
    await selectBackDatedWeek(page);
    await page.getByRole('button', { name: /Mark complete/ }).click();
    await expect.poll(() => state.rpcCalls).toEqual([EVENT_ID]);

    await page.goto('/calendar');
    await page.getByLabel('Day view').click();
    for (let i = 0; i < DAYS_BACK; i++) {
      await page.getByRole('button', { name: 'Previous day' }).click();
    }
    const agenda = page.locator('[data-slot="selected-day-list"]');
    await expect(agenda.getByText('Done')).toBeVisible();
    await expect(agenda.getByText('Missed')).toHaveCount(0);
  });
});
