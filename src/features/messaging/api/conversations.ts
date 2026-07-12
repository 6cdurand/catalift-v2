/**
 * conversations.ts — Conversation API (F2 messaging port)
 *
 * CRUD operations against `public.conversations` + `public.messages`.
 * RLS enforces participant-only access. All writes use await+retry (G-11).
 */

import { getBrowserClient } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { v4 as uuidv4 } from 'uuid';

type ConversationRow = Database['public']['Tables']['conversations']['Row'];
type MessageRow = Database['public']['Tables']['messages']['Row'];

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Retry wrapper for DB writes (G-11).
 */
async function withRetry<T>(fn: () => Promise<T>, operationName: string): Promise<T> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        console.error(
          `[messaging.${operationName}] failed after ${MAX_RETRIES} attempts:`,
          err,
        );
        throw err;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, attempt - 1)),
      );
    }
  }
  throw new Error(`[messaging.${operationName}] retry exhausted`);
}

export interface ConversationItem {
  id: string;
  participant1: string;
  participant2: string;
  lastMessageAt: string | null;
  createdAt: string;
  otherParticipant: {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
  } | null;
  unreadCount: number;
  lastMessage: {
    body: string | null;
    createdAt: string;
    senderId: string;
  } | null;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  body: string | null;
  photoUrl: string | null;
  seenAt: string | null;
  createdAt: string;
}

/**
 * Fetch my conversations with the other participant's profile + unread count.
 * RLS governs access (participant_1 or participant_2 = auth.uid()).
 */
export async function fetchConversations(userId: string): Promise<ConversationItem[]> {
  const supabase = getBrowserClient();

  // Fetch conversations where I'm a participant
  const { data: convos, error: convosError } = await supabase
    .from('conversations')
    .select('*')
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (convosError) throw convosError;
  if (!convos) return [];

  // Get all unique participant IDs (exclude self)
  const participantIds = new Set<string>();
  for (const c of convos) {
    const otherId = c.participant_1 === userId ? c.participant_2 : c.participant_1;
    participantIds.add(otherId);
  }

  // Fetch participant profiles
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, full_name, avatar_url')
    .in('id', Array.from(participantIds));

  if (usersError) throw usersError;

  const userMap = new Map(users?.map((u: { id: string; full_name: string | null; avatar_url: string | null }) => [u.id, u]) || []);

  // Fetch last message for each conversation
  const convoIds = convos.map((c: ConversationRow) => c.id);
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('conversation_id, body, created_at, sender_id')
    .in('conversation_id', convoIds)
    .order('created_at', { ascending: false });

  if (messagesError) throw messagesError;

  // Group messages by conversation (take first = most recent)
  const lastMessageMap = new Map<string, MessageRow>();
  for (const msg of messages || []) {
    if (!lastMessageMap.has(msg.conversation_id)) {
      lastMessageMap.set(msg.conversation_id, msg as MessageRow);
    }
  }

  // Fetch unread counts (messages where seen_at is null AND sender != me)
  const { data: unreadMessages, error: unreadError } = await supabase
    .from('messages')
    .select('conversation_id, id')
    .in('conversation_id', convoIds)
    .is('seen_at', null)
    .neq('sender_id', userId);

  if (unreadError) throw unreadError;

  const unreadCountMap = new Map<string, number>();
  for (const msg of unreadMessages || []) {
    unreadCountMap.set(
      msg.conversation_id,
      (unreadCountMap.get(msg.conversation_id) || 0) + 1,
    );
  }

  // Map to ConversationItem[]
  return convos.map((c: ConversationRow) => {
    const otherId = c.participant_1 === userId ? c.participant_2 : c.participant_1;
    const otherUser = userMap.get(otherId) as { id: string; full_name: string | null; avatar_url: string | null } | undefined;
    const lastMsg = lastMessageMap.get(c.id);

    return {
      id: c.id,
      participant1: c.participant_1,
      participant2: c.participant_2,
      lastMessageAt: c.last_message_at,
      createdAt: c.created_at,
      otherParticipant: otherUser
        ? {
            id: otherUser.id,
            fullName: otherUser.full_name,
            avatarUrl: otherUser.avatar_url,
          }
        : null,
      unreadCount: unreadCountMap.get(c.id) || 0,
      lastMessage: lastMsg
        ? {
            body: lastMsg.body,
            createdAt: lastMsg.created_at,
            senderId: lastMsg.sender_id,
          }
        : null,
    };
  });
}

/**
 * Fetch messages for a conversation, ordered chronologically.
 * RLS enforces membership check via is_conversation_member().
 */
export async function fetchMessages(conversationId: string): Promise<MessageItem[]> {
  const supabase = getBrowserClient();

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!data) return [];

  return data.map((m: MessageRow) => ({
    id: m.id,
    conversationId: m.conversation_id,
    senderId: m.sender_id,
    body: m.body,
    photoUrl: m.photo_url,
    seenAt: m.seen_at,
    createdAt: m.created_at,
  }));
}

/**
 * Get or create a conversation with another user.
 * Checks both participant orientations before creating.
 */
export async function getOrCreateConversation(
  myId: string,
  otherId: string,
): Promise<string> {
  return withRetry(async () => {
    const supabase = getBrowserClient();

    // Check if conversation exists (either orientation)
    const { data: existing, error: fetchError } = await supabase
      .from('conversations')
      .select('id')
      .or(
        `and(participant_1.eq.${myId},participant_2.eq.${otherId}),and(participant_1.eq.${otherId},participant_2.eq.${myId})`,
      )
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (existing) return existing.id;

    // Create new conversation
    const newId = uuidv4();
    const { error: insertError } = await supabase.from('conversations').insert({
      id: newId,
      participant_1: myId,
      participant_2: otherId,
    });

    if (insertError) throw insertError;
    return newId;
  }, 'getOrCreateConversation');
}

/**
 * Send a message in a conversation.
 * Updates conversation.last_message_at after insert.
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
  photoUrl?: string,
): Promise<MessageItem> {
  return withRetry(async () => {
    const supabase = getBrowserClient();

    const messageId = uuidv4();
    const now = new Date().toISOString();

    // Insert message
    const { data, error: messageError } = await supabase
      .from('messages')
      .insert({
        id: messageId,
        conversation_id: conversationId,
        sender_id: senderId,
        body,
        photo_url: photoUrl || null,
      })
      .select()
      .single();

    if (messageError) throw messageError;
    if (!data) throw new Error('[sendMessage] no data returned');

    // Update conversation.last_message_at
    const { error: updateError } = await supabase
      .from('conversations')
      .update({ last_message_at: now })
      .eq('id', conversationId);

    if (updateError) {
      console.error('[sendMessage] failed to update last_message_at:', updateError);
      // Don't throw — message was sent successfully
    }

    return {
      id: data.id,
      conversationId: data.conversation_id,
      senderId: data.sender_id,
      body: data.body,
      photoUrl: data.photo_url,
      seenAt: data.seen_at,
      createdAt: data.created_at,
    };
  }, 'sendMessage');
}

/**
 * Mark all messages in a conversation as seen (where sender != me).
 */
export async function markConversationSeen(
  conversationId: string,
  myId: string,
): Promise<void> {
  return withRetry(async () => {
    const supabase = getBrowserClient();

    const { error } = await supabase
      .from('messages')
      .update({ seen_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', myId)
      .is('seen_at', null);

    if (error) throw error;
  }, 'markConversationSeen');
}
