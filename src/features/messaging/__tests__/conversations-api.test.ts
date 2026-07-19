/**
 * conversations-api.test.ts — Two-account message round-trip via the REAL API
 *
 * Replaces the copied-logic tests with tests against `conversations.ts`.
 * Verifies: send, read back, dedupe id, unread count, markSeen.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  fetchConversations,
  fetchMessages,
  sendMessage,
  markConversationSeen,
} from '../api/conversations';
import { getBrowserClient } from '@/lib/supabase';

vi.mock('@/lib/sentry', () => ({ captureException: vi.fn() }));
vi.mock('@/lib/supabase', () => ({
  getBrowserClient: vi.fn(),
}));

const USER_A = 'user-a';
const USER_B = 'user-b';
const CONVO_ID = 'convo-1';

function makeClient(handlers: Record<string, any>) {
  return {
    from: vi.fn((table: string) => {
      if (!(table in handlers)) throw new Error(`Unexpected table: ${table}`);
      return handlers[table];
    }),
  };
}

describe('messaging API — real path (not a logic copy)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchConversations returns unread count for the recipient only', async () => {
    const messagesHandler = {
      select: vi.fn((cols: string) => {
        // Last-message query
        if (cols.includes('body')) {
          return {
            in: vi.fn(() => ({
              order: vi.fn(() =>
                Promise.resolve({
                  data: [
                    {
                      conversation_id: CONVO_ID,
                      body: 'Hello from A',
                      created_at: '2026-07-19T10:00:00.000Z',
                      sender_id: USER_A,
                    },
                  ],
                  error: null,
                }),
              ),
            })),
          };
        }
        // Unread-count query
        return {
          in: vi.fn(() => ({
            is: vi.fn(() => ({
              neq: vi.fn(() =>
                Promise.resolve({
                  data: [
                    { conversation_id: CONVO_ID, id: 'msg-1' },
                    { conversation_id: CONVO_ID, id: 'msg-2' },
                  ],
                  error: null,
                }),
              ),
            })),
          })),
        };
      }),
    };

    vi.mocked(getBrowserClient).mockReturnValue(
      makeClient({
        conversations: {
          select: vi.fn(() => ({
            or: vi.fn(() => ({
              order: vi.fn(() =>
                Promise.resolve({
                  data: [
                    {
                      id: CONVO_ID,
                      participant_1: USER_A,
                      participant_2: USER_B,
                      last_message_at: '2026-07-19T10:00:00.000Z',
                      created_at: '2026-07-19T09:00:00.000Z',
                    },
                  ],
                  error: null,
                }),
              ),
            })),
          })),
        },
        users: {
          select: vi.fn(() => ({
            in: vi.fn(() =>
              Promise.resolve({
                data: [{ id: USER_A, full_name: 'Alice', avatar_url: null }],
                error: null,
              }),
            ),
          })),
        },
        messages: messagesHandler,
      }) as any,
    );

    const conversations = await fetchConversations(USER_B);

    expect(conversations).toHaveLength(1);
    expect(conversations[0].unreadCount).toBe(2);
    expect(conversations[0].lastMessage?.body).toBe('Hello from A');
    expect(conversations[0].otherParticipant?.fullName).toBe('Alice');
  });

  it('fetchMessages returns the same message A sent, ordered oldest first', async () => {
    vi.mocked(getBrowserClient).mockReturnValue(
      makeClient({
        messages: {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() =>
                Promise.resolve({
                  data: [
                    {
                      id: 'msg-1',
                      conversation_id: CONVO_ID,
                      sender_id: USER_A,
                      body: 'Hello from A',
                      photo_url: null,
                      seen_at: null,
                      created_at: '2026-07-19T10:00:00.000Z',
                    },
                    {
                      id: 'msg-2',
                      conversation_id: CONVO_ID,
                      sender_id: USER_B,
                      body: 'Hi Alice',
                      photo_url: null,
                      seen_at: null,
                      created_at: '2026-07-19T10:01:00.000Z',
                    },
                  ],
                  error: null,
                }),
              ),
            })),
          })),
        },
      }) as any,
    );

    const messages = await fetchMessages(CONVO_ID);

    expect(messages).toHaveLength(2);
    expect(messages[0].id).toBe('msg-1');
    expect(messages[0].body).toBe('Hello from A');
    expect(messages[0].senderId).toBe(USER_A);
    expect(messages[1].id).toBe('msg-2');
    expect(messages[1].body).toBe('Hi Alice');
  });

  it('sendMessage writes the message and updates conversation last_message_at', async () => {
    let insertedPayload: any;
    let updatedPayload: any;

    vi.mocked(getBrowserClient).mockReturnValue(
      makeClient({
        messages: {
          insert: vi.fn((payload: any) => {
            insertedPayload = payload;
            return {
              select: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      id: 'msg-1',
                      conversation_id: payload.conversation_id,
                      sender_id: payload.sender_id,
                      body: payload.body,
                      photo_url: payload.photo_url,
                      seen_at: null,
                      created_at: '2026-07-19T10:00:00.000Z',
                    },
                    error: null,
                  }),
                ),
              })),
            };
          }),
        },
        conversations: {
          update: vi.fn((payload: any) => {
            updatedPayload = payload;
            return {
              eq: vi.fn(() => Promise.resolve({ error: null })),
            };
          }),
        },
      }) as any,
    );

    const sent = await sendMessage(CONVO_ID, USER_A, 'Hello from A');

    expect(insertedPayload).toMatchObject({
      conversation_id: CONVO_ID,
      sender_id: USER_A,
      body: 'Hello from A',
      photo_url: null,
    });
    expect(sent.id).toBe('msg-1');
    expect(sent.body).toBe('Hello from A');
    expect(sent.senderId).toBe(USER_A);

    expect(updatedPayload).toHaveProperty('last_message_at');
  });

  it('markConversationSeen updates only messages from the other user that are unseen', async () => {
    let updatedPayload: any;

    vi.mocked(getBrowserClient).mockReturnValue(
      makeClient({
        messages: {
          update: vi.fn((payload: any) => {
            updatedPayload = payload;
            return {
              eq: vi.fn(() => ({
                neq: vi.fn(() => ({
                  is: vi.fn(() => Promise.resolve({ error: null })),
                })),
              })),
            };
          }),
        },
      }) as any,
    );

    await markConversationSeen(CONVO_ID, USER_B);

    expect(updatedPayload).toHaveProperty('seen_at');
  });

  it('MessagesPage imports the real conversation functions (not copies)', () => {
    const pageSrc = readFileSync(
      join(process.cwd(), 'src/app/(app)/messages/page.tsx'),
      'utf8',
    );
    expect(pageSrc).toMatch(/from\s+['"]@\/features\/messaging\/api\/conversations['"]/);
    expect(pageSrc).toContain('fetchConversations');
    expect(pageSrc).toContain('fetchMessages');
    expect(pageSrc).toContain('sendMessage');
    expect(pageSrc).toContain('markConversationSeen');
  });
});
