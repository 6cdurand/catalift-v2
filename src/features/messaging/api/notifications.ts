/**
 * notifications.ts — Notifications API (F2 messaging port)
 *
 * CRUD operations against `public.notifications`.
 * RLS enforces user_id = auth.uid() (own rows only).
 */

import { getBrowserClient } from '@/lib/supabase';
import type { Database } from '@/types/database';

type NotificationRow = Database['public']['Tables']['notifications']['Row'];

export type NotificationType =
  | 'message'
  | 'booking'
  | 'session_reminder'
  | 'workout_assigned'
  | 'pb_achieved'
  | 'system';

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  seenAt: string | null;
  createdAt: string;
}

/**
 * Fetch my notifications, ordered by created_at descending.
 * RLS governs (user_id = auth.uid()).
 */
export async function fetchNotifications(userId: string): Promise<NotificationItem[]> {
  const supabase = getBrowserClient();

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  if (!data) return [];

  return data.map((n: NotificationRow) => ({
    id: n.id,
    userId: n.user_id,
    type: n.type as NotificationType,
    title: n.title,
    body: n.body,
    data: n.data as Record<string, unknown> | null,
    seenAt: n.seen_at,
    createdAt: n.created_at,
  }));
}

/**
 * Mark all my notifications as seen.
 * RLS governs (user_id = auth.uid()).
 */
export async function markAllNotificationsSeen(userId: string): Promise<void> {
  const supabase = getBrowserClient();

  const { error } = await supabase
    .from('notifications')
    .update({ seen_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('seen_at', null);

  if (error) throw error;
}

/**
 * Mark a single notification as seen.
 */
export async function markNotificationSeen(notificationId: string): Promise<void> {
  const supabase = getBrowserClient();

  const { error } = await supabase
    .from('notifications')
    .update({ seen_at: new Date().toISOString() })
    .eq('id', notificationId)
    .is('seen_at', null);

  if (error) throw error;
}
