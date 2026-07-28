// payments-tracker.spec.ts — E2E smoke for the all-clients payment tracker
// (/payments) and the trainer profile earnings card that links to it. Covers:
// empty roster, rows with/without outstanding, sort order, search, the Log
// payment write, the history tab, and the profile earnings figures.
//
// Set SHOT_DIR=/some/dir to also capture PR screenshots of each state.

import { test, expect, type Page, type Route } from '@playwright/test';
import { mockAuthSession } from './auth-helpers';

const SUPABASE_REF = 'igagmdkdzjkxrwnyvgqk';
const SUPABASE_URL = `https://${SUPABASE_REF}.supabase.co`;
const TRAINER_ID = 'test-user-id';
const SHOT_DIR = process.env.SHOT_DIR;

interface BillingRow {
  client_id: string;
  status: string;
  historical_offset_sessions: number;
  total_paid_offset: number;
  price_per_session: number | null;
  client: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

interface PaymentRow {
  id: string;
  trainer_id: string;
  client_id: string;
  amount: number;
  currency: string;
  sessions_included: number;
  method: string | null;
  status: string;
  description: string | null;
  paid_at: string;
  created_at: string;
}

interface SessionRow {
  id: string;
  trainer_id: string;
  client_id: string;
  session_date: string;
  source: string;
  workout_id: string | null;
  calendar_event_id: string | null;
  notes: string | null;
  created_at: string;
}

function billing(
  clientId: string,
  fullName: string,
  overrides: Partial<BillingRow> = {},
): BillingRow {
  return {
    client_id: clientId,
    status: 'active',
    historical_offset_sessions: 0,
    total_paid_offset: 0,
    price_per_session: null,
    client: {
      id: clientId,
      full_name: fullName,
      email: `${clientId}@example.com`,
      avatar_url: null,
    },
    ...overrides,
  };
}

function session(id: string, clientId: string): SessionRow {
  return {
    id,
    trainer_id: TRAINER_ID,
    client_id: clientId,
    session_date: '2026-07-20',
    source: 'pt_completion',
    workout_id: null,
    calendar_event_id: `program:prog-1:0:2026-07-20`,
    notes: null,
    created_at: '2026-07-20T00:00:00.000Z',
  };
}

function payment(
  id: string,
  clientId: string,
  overrides: Partial<PaymentRow> = {},
): PaymentRow {
  return {
    id,
    trainer_id: TRAINER_ID,
    client_id: clientId,
    amount: 200,
    currency: 'NZD',
    sessions_included: 4,
    method: 'bank_transfer',
    status: 'paid',
    description: '4-session block',
    paid_at: '2026-07-01T00:00:00.000Z',
    created_at: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

/** PostgREST `.single()` asks for a bare object via the Accept header. */
function wantsSingleObject(route: Route): boolean {
  const accept = route.request().headers()['accept'] ?? '';
  return accept.includes('vnd.pgrst.object');
}

async function mockTracker(
  page: Page,
  initial: {
    billing: BillingRow[];
    sessions: SessionRow[];
    payments: PaymentRow[];
  },
) {
  const state = {
    billing: initial.billing.map((b) => ({ ...b })),
    sessions: [...initial.sessions],
    payments: [...initial.payments],
  };

  await mockAuthSession(page);

  // Catch-all registered FIRST so the specific handlers below win (Playwright
  // matches the most recently registered route first).
  await page.route(`${SUPABASE_URL}/rest/v1/**`, (route) => json(route, []));

  await page.route(`${SUPABASE_URL}/rest/v1/users*`, (route) =>
    json(route, { role: 'trainer' }),
  );

  await page.route(`${SUPABASE_URL}/rest/v1/trainer_clients*`, async (route) => {
    const method = route.request().method();
    const url = route.request().url();

    if (method === 'PATCH') {
      const body = route.request().postDataJSON() as Record<string, number>;
      const clientId = /client_id=eq\.([^&]+)/.exec(url)?.[1];
      state.billing = state.billing.map((b) =>
        b.client_id === clientId ? { ...b, ...body } : b,
      );
      await json(route, []);
      return;
    }

    // adjustPaidOffset / adjustSessionOffset read one row with .single().
    if (wantsSingleObject(route)) {
      const clientId = /client_id=eq\.([^&]+)/.exec(url)?.[1];
      const row = state.billing.find((b) => b.client_id === clientId);
      await json(route, row ?? {});
      return;
    }

    await json(route, state.billing);
  });

  await page.route(`${SUPABASE_URL}/rest/v1/client_sessions*`, (route) =>
    json(route, state.sessions),
  );

  await page.route(`${SUPABASE_URL}/rest/v1/client_payments*`, async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as Partial<PaymentRow>;
      const row = payment(`pay-${state.payments.length + 2}`, 'unknown', {
        paid_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        description: null,
        ...body,
      });
      state.payments = [row, ...state.payments];
      await json(route, row, 201);
      return;
    }
    await json(route, state.payments);
  });
}

/** Alice owes $100, Bob owes $200, Cara is square. */
function rosterFixture() {
  return {
    billing: [
      billing('alice', 'Alice Adams', {
        historical_offset_sessions: 5,
        total_paid_offset: 2,
        price_per_session: 50,
      }),
      billing('bob', 'Bob Brown', { price_per_session: 100 }),
      billing('cara', 'Cara Cole', {
        historical_offset_sessions: 3,
        total_paid_offset: 3,
        price_per_session: 25,
      }),
    ],
    sessions: [
      session('s1', 'alice'),
      session('s2', 'alice'),
      session('s3', 'alice'),
      session('s4', 'bob'),
      session('s5', 'bob'),
    ],
    payments: [payment('pay-1', 'alice')],
  };
}

async function shot(page: Page, name: string, testId: string) {
  if (!SHOT_DIR) return;
  await page.setViewportSize({ width: 390, height: 1400 });
  await page.getByTestId(testId).screenshot({ path: `${SHOT_DIR}/${name}.png` });
}

test.describe('Payment tracker — /payments', () => {
  test('empty roster shows zeroed summary and an empty state', async ({ page }) => {
    await mockTracker(page, { billing: [], sessions: [], payments: [] });

    await page.goto('http://localhost:3000/payments');

    await expect(page.getByTestId('summary-outstanding')).toHaveText('$0.00');
    await expect(page.getByTestId('summary-total-paid')).toHaveText('$0.00');
    await expect(page.getByTestId('summary-sessions')).toHaveText('0');
    await expect(page.getByTestId('payments-clients-empty')).toBeVisible();

    await shot(page, 'payments-empty-roster', 'trainer-payments-surface');
  });

  test('renders derived rows, the amber border only when owed, and the sort order', async ({
    page,
  }) => {
    await mockTracker(page, rosterFixture());

    await page.goto('http://localhost:3000/payments');

    // Roster-wide summary: $100 + $200 owed, $200 collected, 8 + 2 + 3 sessions.
    await expect(page.getByTestId('summary-outstanding')).toHaveText('$300.00');
    await expect(page.getByTestId('summary-total-paid')).toHaveText('$200.00');
    await expect(page.getByTestId('summary-sessions')).toHaveText('13');

    // Outstanding first, largest first, then alphabetical.
    const rows = page.getByTestId('payment-client-row');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toHaveAttribute('data-client-id', 'bob');
    await expect(rows.nth(1)).toHaveAttribute('data-client-id', 'alice');
    await expect(rows.nth(2)).toHaveAttribute('data-client-id', 'cara');

    const alice = rows.nth(1);
    await expect(alice.getByTestId('row-completed')).toHaveText('8');
    await expect(alice.getByTestId('row-paid')).toHaveText('6');
    await expect(alice.getByTestId('row-outstanding')).toHaveText('$100.00');
    await expect(alice).toHaveClass(/border-l-amber-500/);
    await expect(rows.nth(2)).not.toHaveClass(/border-l-amber-500/);
    await expect(rows.nth(2).getByTestId('row-outstanding-alert')).toHaveCount(0);

    await shot(page, 'payments-clients', 'trainer-payments-surface');

    // Search narrows the list by name.
    await page.getByPlaceholder('Search clients...').fill('cara');
    await expect(page.getByTestId('payment-client-row')).toHaveCount(1);
  });

  test('logs a payment from an outstanding row and refreshes every figure', async ({
    page,
  }) => {
    await mockTracker(page, rosterFixture());

    await page.goto('http://localhost:3000/payments');

    await page
      .getByRole('button', { name: 'Log outstanding payment for Alice Adams' })
      .click();

    // Defaults are the derived outstanding figures.
    await expect(page.getByLabel(/^Amount/)).toHaveValue('100');
    await expect(page.getByLabel(/sessions included/i)).toHaveValue('2');
    await page.getByRole('button', { name: /save payment/i }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);

    const alice = page
      .getByTestId('payment-client-row')
      .filter({ has: page.getByText('Alice Adams') });
    await expect(alice.getByTestId('row-paid')).toHaveText('8');
    await expect(alice.getByTestId('row-outstanding-alert')).toHaveCount(0);
    await expect(page.getByTestId('summary-outstanding')).toHaveText('$200.00');
    await expect(page.getByTestId('summary-total-paid')).toHaveText('$300.00');
  });

  test('history lists payments across all clients, newest first', async ({
    page,
  }) => {
    await mockTracker(page, {
      ...rosterFixture(),
      payments: [
        payment('pay-new', 'bob', {
          amount: 300,
          paid_at: '2026-07-20T00:00:00.000Z',
          created_at: '2026-07-20T00:00:00.000Z',
        }),
        payment('pay-old', 'alice', {
          amount: 100,
          paid_at: '2026-05-01T00:00:00.000Z',
          created_at: '2026-05-01T00:00:00.000Z',
        }),
      ],
    });

    await page.goto('http://localhost:3000/payments');
    await page.getByRole('tab', { name: /history/i }).click();

    const items = page.getByTestId('payments-history-item');
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toContainText('Bob Brown');
    await expect(items.nth(0)).toContainText('$300.00');
    await expect(items.nth(1)).toContainText('Alice Adams');
    await expect(items.nth(1)).toContainText('$100.00');

    await shot(page, 'payments-history', 'trainer-payments-surface');
  });
});

test.describe('Profile — trainer earnings card', () => {
  test('shows real payment-derived earnings and opens the tracker', async ({
    page,
  }) => {
    await mockTracker(page, rosterFixture());

    await page.goto('http://localhost:3000/profile');

    const earnings = page.getByTestId('profile-earnings-row');
    // The one $200 payment is the trainer's all-time total.
    await expect(earnings).toContainText('$200');

    await shot(page, 'profile-earnings-card', 'profile-earnings-row');

    await earnings.click();
    await expect(page).toHaveURL(/\/payments$/);
    await expect(page.getByTestId('summary-outstanding')).toHaveText('$300.00');
  });
});
