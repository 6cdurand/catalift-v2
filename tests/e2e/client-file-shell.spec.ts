// client-file-shell.spec.ts — E2E for the trainer client file shell (P-06-L1).
//
// Covers: the five tabs in v1's order, the header @handle, the `?with=` deep link
// that v2 used to ignore, the in-tab Messages thread with reload persistence,
// Remove Client (cancel + confirm), and the `?tab=` deep link surviving a hard
// reload without an /auth bounce (G-18).
//
// Also pins the count fix: the page must never label the `workouts` row count as
// "sessions" — that number belongs to the ledger alone.

import { test, expect, type Page, type Route } from '@playwright/test';
import { mockAuthSession } from './auth-helpers';

const SUPABASE_REF = 'igagmdkdzjkxrwnyvgqk';
const SUPABASE_URL = `https://${SUPABASE_REF}.supabase.co`;
const CLIENT_ID = 'client-1';
const TRAINER_ID = 'test-user-id';
const CONVO_ID = 'convo-1';
const CLIENT_NAME = 'Anna Jones';

// 7 workout rows → client.sessions = 7. The ledger says 3 (offset 3 + no rows),
// so if "7 sessions" ever renders again the two authorities are back.
const WORKOUT_COUNT = 7;

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  photo_url: string | null;
  seen_at: string | null;
  created_at: string;
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

function makeWorkouts() {
  return Array.from({ length: WORKOUT_COUNT }, (_, i) => ({
    id: `w-${i + 1}`,
    user_id: CLIENT_ID,
    name: `Session ${i + 1}`,
    performed_at: `2026-07-0${i + 1}T10:00:00.000Z`,
    exercises: [],
    total_volume: 1000 + i,
  }));
}

async function mockClientFile(
  page: Page,
  opts: { username?: string | null; status?: string; messages?: MessageRow[] } = {},
) {
  const state = {
    username: opts.username === undefined ? 'annaj' : opts.username,
    status: opts.status ?? 'active',
    messages: [...(opts.messages ?? [])],
    conversations: [
      {
        id: CONVO_ID,
        participant_1: TRAINER_ID,
        participant_2: CLIENT_ID,
        last_message_at: null as string | null,
        created_at: '2026-07-01T00:00:00.000Z',
      },
    ],
    removed: false,
  };
  const workouts = makeWorkouts();

  await mockAuthSession(page);

  // `users` serves two different reads: the role gate, and the conversation
  // participant profiles.
  await page.route(`${SUPABASE_URL}/rest/v1/users*`, async (route) => {
    const url = route.request().url();
    if (url.includes('full_name')) {
      await json(route, [
        { id: CLIENT_ID, full_name: CLIENT_NAME, avatar_url: null },
        { id: TRAINER_ID, full_name: 'Test Trainer', avatar_url: null },
      ]);
      return;
    }
    await json(route, { role: 'trainer' });
  });

  await page.route(`${SUPABASE_URL}/rest/v1/client_programs*`, (route) =>
    json(route, []),
  );
  await page.route(`${SUPABASE_URL}/rest/v1/client_sessions*`, (route) =>
    json(route, []),
  );
  await page.route(`${SUPABASE_URL}/rest/v1/client_payments*`, (route) =>
    json(route, []),
  );
  await page.route(`${SUPABASE_URL}/rest/v1/personal_bests*`, (route) =>
    json(route, []),
  );

  await page.route(`${SUPABASE_URL}/rest/v1/workouts*`, async (route) => {
    const url = route.request().url();
    // fetchWorkoutHistory asks for total_volume; the roster count asks for
    // user_id/performed_at only. Same rows either way.
    if (url.includes('total_volume')) {
      await json(route, workouts);
      return;
    }
    await json(
      route,
      workouts.map((w) => ({ user_id: w.user_id, performed_at: w.performed_at })),
    );
  });

  await page.route(`${SUPABASE_URL}/rest/v1/trainer_clients*`, async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (method === 'DELETE') {
      state.removed = true;
      await json(route, [{ id: 'tc-1' }]);
      return;
    }

    // fetchClientBilling reads the billing columns directly.
    if (url.includes('historical_offset_sessions')) {
      await json(route, {
        historical_offset_sessions: 3,
        total_paid_offset: 0,
        price_per_session: null,
      });
      return;
    }

    // fetchClients() roster read.
    if (state.removed) {
      await json(route, []);
      return;
    }
    await json(route, [
      {
        id: 'tc-1',
        client_id: CLIENT_ID,
        status: state.status,
        client: {
          id: CLIENT_ID,
          full_name: CLIENT_NAME,
          email: 'anna@example.com',
          avatar_url: null,
          username: state.username,
        },
      },
    ]);
  });

  await page.route(`${SUPABASE_URL}/rest/v1/conversations*`, async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (method === 'POST') {
      await json(route, [], 201);
      return;
    }
    if (method === 'PATCH') {
      await json(route, []);
      return;
    }
    // getOrCreateConversation probes with select=id + an or(and(...)) filter.
    if (url.includes('select=id')) {
      await json(route, [{ id: CONVO_ID }]);
      return;
    }
    await json(route, state.conversations);
  });

  await page.route(`${SUPABASE_URL}/rest/v1/messages*`, async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (method === 'POST') {
      const body = route.request().postDataJSON() as Partial<MessageRow>;
      const row: MessageRow = {
        id: body.id ?? `m-${state.messages.length + 1}`,
        conversation_id: CONVO_ID,
        sender_id: TRAINER_ID,
        body: null,
        photo_url: null,
        seen_at: null,
        created_at: new Date().toISOString(),
        ...body,
      };
      state.messages = [...state.messages, row];
      await json(route, row, 201);
      return;
    }
    if (method === 'PATCH') {
      state.messages = state.messages.map((m) =>
        m.sender_id === TRAINER_ID ? m : { ...m, seen_at: new Date().toISOString() },
      );
      await json(route, []);
      return;
    }
    // fetchConversations' last-message query
    if (url.includes('body')) {
      await json(
        route,
        state.messages.map((m) => ({
          conversation_id: m.conversation_id,
          body: m.body,
          created_at: m.created_at,
          sender_id: m.sender_id,
        })),
      );
      return;
    }
    // fetchConversations' unread-count query
    if (url.includes('seen_at=is.null')) {
      await json(
        route,
        state.messages
          .filter((m) => m.seen_at === null && m.sender_id !== TRAINER_ID)
          .map((m) => ({ conversation_id: m.conversation_id, id: m.id })),
      );
      return;
    }
    // fetchMessages
    await json(route, state.messages);
  });

  return state;
}

test.describe('Client file — shell', () => {
  test('renders the five tabs in v1 order and each panel on click', async ({ page }) => {
    await mockClientFile(page);
    await page.goto(`http://localhost:3000/clients/${CLIENT_ID}`);

    await expect(page.getByRole('tab')).toHaveCount(5);
    await expect(page.getByRole('tab')).toHaveText([
      'Overview',
      'Program',
      'Progress',
      'Messages',
      'Payments',
    ]);

    // Overview is the default panel.
    await expect(page.getByTestId('overview-workouts-logged')).toBeVisible();

    await page.getByRole('tab', { name: 'Program', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Programs', exact: true })).toBeVisible();

    await page.getByRole('tab', { name: 'Progress' }).click();
    await expect(page.getByTestId('progress-workout-history')).toBeVisible();

    await page.getByRole('tab', { name: 'Messages' }).click();
    await expect(page.getByTestId('conversation-thread')).toBeVisible();

    await page.getByRole('tab', { name: 'Payments' }).click();
    await expect(page.getByTestId('client-payments-section')).toBeVisible();
  });

  test('shows the @handle and never labels the workouts count as sessions', async ({
    page,
  }) => {
    await mockClientFile(page);
    await page.goto(`http://localhost:3000/clients/${CLIENT_ID}`);

    await expect(page.getByText(`@annaj`)).toBeVisible();
    await expect(page.getByTestId('overview-workouts-logged')).toHaveText(
      `${WORKOUT_COUNT} workouts logged`,
    );
    // The count fix: 7 is a workout count and must never read as sessions.
    await expect(page.getByText(/7\s*sessions?/i)).toHaveCount(0);

    // The ONE authority for "sessions" lives in the Payments tab.
    await page.getByRole('tab', { name: 'Payments' }).click();
    await expect(page.getByTestId('stat-completed')).toHaveText('3');
    await expect(page.getByText(/7\s*sessions?/i)).toHaveCount(0);
  });

  test('renders nothing rather than a bare @ when the client has no username', async ({
    page,
  }) => {
    await mockClientFile(page, { username: null });
    await page.goto(`http://localhost:3000/clients/${CLIENT_ID}`);

    await expect(page.getByTestId('overview-workouts-logged')).toBeVisible();
    await expect(page.getByTestId('app-header')).not.toContainText('@');
  });

  test('deep link ?tab=messages survives a hard reload without an /auth bounce', async ({
    page,
  }) => {
    await mockClientFile(page);
    await page.goto(`http://localhost:3000/clients/${CLIENT_ID}?tab=messages`);

    await expect(page.getByTestId('conversation-thread')).toBeVisible();

    await page.reload();

    await expect(page).toHaveURL(
      `http://localhost:3000/clients/${CLIENT_ID}?tab=messages`,
    );
    await expect(page.getByTestId('conversation-thread')).toBeVisible();
  });
});

test.describe('Client file — Messages tab', () => {
  test('sends a message that is still there after a hard reload', async ({ page }) => {
    await mockClientFile(page);
    await page.goto(`http://localhost:3000/clients/${CLIENT_ID}?tab=messages`);

    const composer = page.getByLabel('Message', { exact: true });
    await composer.fill('Nice work today');
    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByTestId('message-bubble')).toHaveCount(1);
    await expect(page.getByTestId('message-bubble')).toContainText('Nice work today');

    await page.reload();

    await expect(page.getByTestId('message-bubble')).toHaveCount(1);
    await expect(page.getByTestId('message-bubble')).toContainText('Nice work today');
  });

  test('the quick-action Message button stays on the client file', async ({ page }) => {
    await mockClientFile(page);
    await page.goto(`http://localhost:3000/clients/${CLIENT_ID}`);

    await page.getByTestId('quick-action-message').click();

    await expect(page.getByTestId('conversation-thread')).toBeVisible();
    await expect(page).toHaveURL(
      `http://localhost:3000/clients/${CLIENT_ID}?tab=messages`,
    );
  });
});

test.describe('Client file — header Message deep link', () => {
  test('lands on /messages with that client thread already open', async ({ page }) => {
    // Before P-06-L1 the /messages page ignored ?with= entirely, so this landed
    // on the conversation list and this test failed.
    await mockClientFile(page, {
      messages: [
        {
          id: 'm-existing',
          conversation_id: CONVO_ID,
          sender_id: CLIENT_ID,
          body: 'Morning!',
          photo_url: null,
          seen_at: null,
          created_at: '2026-07-10T08:00:00.000Z',
        },
      ],
    });
    await page.goto(`http://localhost:3000/clients/${CLIENT_ID}`);

    // `exact` matters: MainLayout's global mail button is labelled "Messages",
    // which a substring match would pick up instead.
    await page.getByRole('button', { name: 'Message', exact: true }).first().click();

    await expect(page).toHaveURL(
      `http://localhost:3000/messages?with=${CLIENT_ID}`,
      { timeout: 20_000 },
    );
    // The thread — not the conversation list.
    await expect(page.getByTestId('conversation-thread')).toBeVisible();
    await expect(page.getByTestId('message-bubble')).toContainText('Morning!');
    await expect(page.getByRole('button', { name: 'Back to conversations' })).toBeVisible();
  });
});

test.describe('Client file — Remove Client', () => {
  test('cancelling the confirm leaves the client in place', async ({ page }) => {
    await mockClientFile(page);
    await page.goto(`http://localhost:3000/clients/${CLIENT_ID}`);

    await page.getByRole('button', { name: 'Remove client' }).click();

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toContainText('Remove Client');
    await expect(dialog).toContainText('will NOT be deleted');

    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await expect(page).toHaveURL(`http://localhost:3000/clients/${CLIENT_ID}`);
    await expect(page.getByTestId('overview-workouts-logged')).toBeVisible();
  });

  test('confirming removes the link and returns to the roster without the client', async ({
    page,
  }) => {
    await mockClientFile(page);
    await page.goto(`http://localhost:3000/clients/${CLIENT_ID}`);

    await page.getByRole('button', { name: 'Remove client' }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Remove Client' })
      .click();

    // Generous timeout: this is a cross-route client navigation, and the dev
    // server compiles /clients on demand under parallel workers.
    await expect(page).toHaveURL('http://localhost:3000/clients', {
      timeout: 20_000,
    });
    await expect(page.getByText(CLIENT_NAME)).toHaveCount(0);
  });
});
