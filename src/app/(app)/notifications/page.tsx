'use client';

/**
 * /notifications — Notifications screen (F2 port from v1)
 *
 * Notification feed + mark-seen + tap-to-route. Verbatim UI port from v1,
 * rewired to v2 data layer (fetchNotifications, markAllNotificationsSeen).
 *
 * RLS enforces user_id = auth.uid() (own rows only).
 */

import { useEffect, useState } from 'react';
import { useSession } from '@/features/auth';
import { useRouter } from 'next/navigation';
import { MainLayout, PageHeader } from '@/components/layouts/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  MessageCircle,
  Calendar,
  Trophy,
  Dumbbell,
  AlertCircle,
  CheckCheck,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  fetchNotifications,
  markAllNotificationsSeen,
  markNotificationSeen,
  type NotificationItem,
  type NotificationType,
} from '@/features/messaging/api/notifications';
import { getBrowserClient } from '@/lib/supabase';

const NOTIFICATION_ICONS: Record<NotificationType, React.ElementType> = {
  message: MessageCircle,
  booking: Calendar,
  session_reminder: Calendar,
  workout_assigned: Dumbbell,
  pb_achieved: Trophy,
  system: AlertCircle,
};

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  message: 'text-sky-500',
  booking: 'text-purple-500',
  session_reminder: 'text-orange-500',
  workout_assigned: 'text-green-500',
  pb_achieved: 'text-amber-500',
  system: 'text-gray-500',
};

export default function NotificationsPage() {
  const { user, loading } = useSession();
  const router = useRouter();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [markingAllSeen, setMarkingAllSeen] = useState(false);

  // Load notifications on mount
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const notifs = await fetchNotifications(user.id);
        setNotifications(notifs);
      } catch (err) {
        console.error('[NotificationsPage] failed to load notifications:', err);
      } finally {
        setLoadingNotifications(false);
      }
    };
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!user) return;

    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const newNotif = payload.new as unknown as NotificationItem;
          setNotifications((prev) => {
            // Dedupe by id
            if (prev.some((n) => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev];
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const updated = payload.new as unknown as NotificationItem;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n)),
          );
        },
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [user]);

  const handleMarkAllSeen = async () => {
    if (!user) return;
    setMarkingAllSeen(true);
    try {
      await markAllNotificationsSeen(user.id);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, seenAt: n.seenAt || new Date().toISOString() })),
      );
    } catch (err) {
      console.error('[NotificationsPage] failed to mark all seen:', err);
    } finally {
      setMarkingAllSeen(false);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    // Mark as seen if not already
    if (!notif.seenAt) {
      try {
        await markNotificationSeen(notif.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notif.id ? { ...n, seenAt: new Date().toISOString() } : n,
          ),
        );
      } catch (err) {
        console.error('[NotificationsPage] failed to mark seen:', err);
      }
    }

    // Route based on type + data
    if (notif.type === 'message' && notif.data?.conversationId) {
      router.push(`/messages?conversation=${notif.data.conversationId}`);
    } else if (notif.type === 'workout_assigned' && notif.data?.programId) {
      router.push('/program');
    } else if (notif.type === 'pb_achieved' && notif.data?.exerciseId) {
      router.push('/pbs');
    }
    // Add more routing logic as needed
  };

  const unreadCount = notifications.filter((n) => !n.seenAt).length;

  if (loading || !user) return null;

  return (
    <MainLayout>
      <PageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread`}
        action={
          unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllSeen}
              disabled={markingAllSeen}
              className="text-sky-500 hover:text-sky-600"
            >
              {markingAllSeen ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCheck className="w-4 h-4 mr-1" />
                  Mark all read
                </>
              )}
            </Button>
          ) : undefined
        }
      />

      <ScrollArea className="flex-1 px-4 py-4">
        {loadingNotifications ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">No notifications yet</p>
            <p className="text-xs text-gray-500 mt-1">
              We&apos;ll notify you about important updates
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => {
              const Icon = NOTIFICATION_ICONS[notif.type];
              const iconColor = NOTIFICATION_COLORS[notif.type];
              const isUnread = !notif.seenAt;

              return (
                <Card
                  key={notif.id}
                  className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                    isUnread ? 'bg-sky-50/50' : ''
                  }`}
                  onClick={() => void handleNotificationClick(notif)}
                >
                  <CardContent className="p-3 flex items-start gap-3">
                    <div className={`p-2 rounded-full ${isUnread ? 'bg-sky-100' : 'bg-gray-100'}`}>
                      <Icon className={`w-5 h-5 ${iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p
                          className={`font-medium ${isUnread ? 'text-gray-900' : 'text-gray-700'} truncate`}
                        >
                          {notif.title}
                        </p>
                        <span className="text-xs text-gray-500 ml-2 shrink-0">
                          {formatDistanceToNow(new Date(notif.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      {notif.body && (
                        <p
                          className={`text-sm ${isUnread ? 'text-gray-700' : 'text-gray-500'} mt-1`}
                        >
                          {notif.body}
                        </p>
                      )}
                      {isUnread && (
                        <Badge className="bg-sky-500 text-white mt-2">New</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </MainLayout>
  );
}
