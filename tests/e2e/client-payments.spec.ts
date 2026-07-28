// client-payments.spec.ts — E2E smoke for the Payments section on the trainer
// client file (/clients/[id]). Covers: derived summary, outstanding warning,
// history empty + populated states, Log Payment write, and reload persistence.
//
// Set SHOT_DIR=/some/dir to also capture PR screenshots of each state.

import { test, expect, type Page, type Route } from '@playwright/test';
import { mockAuthSession } from './auth-helpers';

const SUPABASE_REF = 'igagmdkdzjkxrwnyvgqk';
const SUPABASE_URL = `https://${SUPABASE_REF}.supabase.co`;
const CLIENT_ID = 'client-1';
const TRAINER_ID = 'test-user-id';
const SHOT_DIR = process.env.SHOT_DIR;

interface BillingRow {
  historical_offset_sessions: number;
  total_paid_offset: number;
  price_per_session: number | null;
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

function makeSession(id: string, dayIndex: number): SessionRow {
  return {
    id,
    trainer_id: TRAINER_ID,
    client_id: CLIENT_ID,
    session_date: '2026-07-20',
    source: 'pt_completion',
    workout_id: null,
    // Today lane writes this synthetic shape — it must count like any other.
    calendar_event_id: `program:prog-1:${dayIndex}:2026-07-2${dayIndex}`,
    notes: null,
    created_at: '2026-07-20T00:00:00.000Z',
  };
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function mockClientFile(
  page: Page,
  initial: { billing: BillingRow; sessions: SessionRow[]; payments: PaymentRow[] },
) {
  const state = {
    billing: { ...initial.billing },
    sessions: [...initial.sessions],
    payments: [...initial.payments],
  };

  await mockAuthSession(page);

  await page.route(`${SUPABASE_URL}/rest/v1/users*`, (route) =>
    json(route, { role: 'trainer' }),
  );

  await page.route(`${SUPABASE_URL}/rest/v1/client_programs*`, (route) =>
    json(route, []),
  );

  await page.route(`${SUPABASE_URL}/rest/v1/workouts*`, (route) =>
    json(route, []),
  );

  await page.route(`${SUPABASE_URL}/rest/v1/trainer_clients*`, async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (method === 'PATCH') {
      const body = route.request().postDataJSON() as Partial<BillingRow>;
      state.billing = { ...state.billing, ...body };
      await json(route, [state.billing]);
      return;
    }

    // fetchClientBilling / adjustPaidOffset read the billing columns directly.
    if (
      url.includes('historical_offset_sessions') ||
      url.includes('total_paid_offset') ||
      url.includes('price_per_session')
    ) {
      await json(route, state.billing);
      return;
    }

    // fetchClients() roster read — no billing columns.
    await json(route, [
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
    ]);
  });

  await page.route(`${SUPABASE_URL}/rest/v1/client_sessions*`, async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as Partial<SessionRow>;
      const row: SessionRow = {
        ...makeSession(`s-${state.sessions.length + 1}`, 0),
        ...body,
        id: `s-${state.sessions.length + 1}`,
      };
      state.sessions = [row, ...state.sessions];
      await json(route, row, 201);
      return;
    }
    await json(route, state.sessions);
  });

  await page.route(`${SUPABASE_URL}/rest/v1/client_payments*`, async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as Partial<PaymentRow>;
      const row: PaymentRow = {
        id: `pay-${state.payments.length + 1}`,
        trainer_id: TRAINER_ID,
        client_id: CLIENT_ID,
        amount: 0,
        currency: 'NZD',
        sessions_included: 1,
        method: null,
        status: 'paid',
        description: null,
        paid_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        ...body,
      };
      state.payments = [row, ...state.payments];
      await json(route, row, 201);
      return;
    }
    await json(route, state.payments);
  });
}

/** No-op unless SHOT_DIR is set — used to capture PR screenshots. */
async function shot(page: Page, name: string, testId = 'client-payments-section') {
  if (!SHOT_DIR) return;
  await page.setViewportSize({ width: 1024, height: 1600 });
  await page.getByTestId(testId).screenshot({ path: `${SHOT_DIR}/${name}.png` });
}

async function shotDialog(page: Page, name: string) {
  if (!SHOT_DIR) return;
  await page.getByRole('dialog').screenshot({ path: `${SHOT_DIR}/${name}.png` });
}

test.describe('Client file — Payments section', () => {
  test('renders derived counts, the outstanding warning and payment history', async ({
    page,
  }) => {
    await mockClientFile(page, {
      billing: {
        historical_offset_sessions: 5,
        total_paid_offset: 2,
        price_per_session: 50,
      },
      sessions: [makeSession('s1', 0), makeSession('s2', 1), makeSession('s3', 2)],
      payments: [
        {
          id: 'pay-1',
          trainer_id: TRAINER_ID,
          client_id: CLIENT_ID,
          amount: 200,
          currency: 'NZD',
          sessions_included: 4,
          method: 'bank_transfer',
          status: 'paid',
          description: '4-session block',
          paid_at: '2026-07-01T00:00:00.000Z',
          created_at: '2026-07-01T00:00:00.000Z',
        },
      ],
    });

    await page.goto(`http://localhost:3000/clients/${CLIENT_ID}`);

    // 5 offset + 3 rows = 8 completed; 2 offset + 4 included = 6 paid.
    await expect(page.getByTestId('stat-completed')).toHaveText('8');
    await expect(page.getByTestId('stat-paid')).toHaveText('6');
    await expect(page.getByTestId('stat-outstanding')).toHaveText('$100.00');

    const warning = page.getByTestId('outstanding-warning');
    await expect(warning).toHaveCount(1);
    await expect(warning).toContainText('2 sessions outstanding');

    await expect(page.getByTestId('payment-history-item')).toHaveCount(1);
    await expect(page.getByTestId('payment-history-item')).toContainText('$200.00');

    await shot(page, 'payments-outstanding-warning');
  });

  test('shows the empty history state and no warning when settled', async ({
    page,
  }) => {
    await mockClientFile(page, {
      billing: {
        historical_offset_sessions: 0,
        total_paid_offset: 0,
        price_per_session: null,
      },
      sessions: [],
      payments: [],
    });

    await page.goto(`http://localhost:3000/clients/${CLIENT_ID}`);

    await expect(page.getByTestId('stat-completed')).toHaveText('0');
    await expect(page.getByTestId('stat-paid')).toHaveText('0');
    await expect(page.getByTestId('outstanding-warning')).toHaveCount(0);
    await expect(page.getByTestId('payment-history-empty')).toBeVisible();

    await shot(page, 'payments-empty');
  });

  test('logs a payment and the summary + history reflect it after reload', async ({
    page,
  }) => {
    await mockClientFile(page, {
      billing: {
        historical_offset_sessions: 0,
        total_paid_offset: 0,
        price_per_session: 60,
      },
      sessions: [makeSession('s1', 0), makeSession('s2', 1)],
      payments: [],
    });

    await page.goto(`http://localhost:3000/clients/${CLIENT_ID}`);
    await expect(page.getByTestId('stat-completed')).toHaveText('2');
    await expect(page.getByTestId('stat-paid')).toHaveText('0');

    await page.getByRole('button', { name: /log payment/i }).click();
    await page.getByLabel(/^Amount/).fill('120');
    await page.getByLabel(/sessions included/i).fill('2');
    await page.getByRole('button', { name: 'Cash' }).click();

    await shotDialog(page, 'payments-log-dialog');

    await page.getByRole('button', { name: /save payment/i }).click();

    await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('stat-paid')).toHaveText('2');
    await expect(page.getByTestId('outstanding-warning')).toHaveCount(0);
    await expect(page.getByTestId('payment-history-item')).toHaveCount(1);

    await page.getByTestId('payment-history-item').scrollIntoViewIfNeeded();
    await shot(page, 'payments-populated');

    // Reload assertion — the write must survive a refresh, not just optimistic state.
    await page.reload();
    await expect(page.getByTestId('stat-paid')).toHaveText('2');
    await expect(page.getByTestId('payment-history-item')).toContainText('$120.00');
  });

  test('changing the per-session rate moves the amount, not the session counts', async ({
    page,
  }) => {
    await mockClientFile(page, {
      billing: {
        historical_offset_sessions: 0,
        total_paid_offset: 0,
        price_per_session: 50,
      },
      sessions: [makeSession('s1', 0), makeSession('s2', 1)],
      payments: [],
    });

    await page.goto(`http://localhost:3000/clients/${CLIENT_ID}`);
    await expect(page.getByTestId('stat-outstanding')).toHaveText('$100.00');

    await page.getByLabel(/per-session rate/i).fill('80');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(page.getByTestId('stat-outstanding')).toHaveText('$160.00');
    await expect(page.getByTestId('stat-completed')).toHaveText('2');
    await expect(page.getByTestId('stat-paid')).toHaveText('0');
  });
});
