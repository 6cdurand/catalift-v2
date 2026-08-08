'use client';

/**
 * /messages — Messages screen (F2 port from v1)
 *
 * Conversation list + thread view + composer. Verbatim UI port from v1,
 * rewired to v2 data layer (fetchConversations, fetchMessages, sendMessage).
 *
 * RLS enforces participant-only access. Realtime updates via postgres_changes
 * subscription (or refetch fallback if tables not in publication).
 *
 * The thread itself lives in `@/features/messaging` (ConversationThread) so the
 * trainer client file's Messages tab renders the same implementation instead of
 * a second copy.
 */

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from '@/features/auth';
import { MainLayout, PageHeader } from '@/components/layouts/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  ConversationThread,
  fetchConversations,
  getOrCreateConversation,
  type ConversationItem,
} from '@/features/messaging';
import { getBrowserClient } from '@/lib/supabase';

// useSearchParams requires a Suspense boundary (same wrapper as
// src/app/workout/builder/page.tsx:103-110).
export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesContent />
    </Suspense>
  );
}

function MessagesContent() {
  const { user, loading } = useSession();
  const searchParams = useSearchParams();
  const withUserId = searchParams.get('with');

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationItem | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(true);

  // Load conversations on mount
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const convos = await fetchConversations(user.id);
        setConversations(convos);
      } catch (err) {
        console.error('[MessagesPage] failed to load conversations:', err);
      } finally {
        setLoadingConversations(false);
      }
    };
    void load();
  }, [user]);

  // `?with=<userId>` deep link — open (creating if needed) that person's thread.
  // v1 honours this param at `v1: src/app/messages/page.tsx:168`; v2
  // ignored it entirely, so the client file's Message button landed the trainer
  // on the conversation list. Guarded by a ref so returning to the list does not
  // immediately re-open the thread while the param is still in the URL.
  const handledWith = useRef<string | null>(null);
  useEffect(() => {
    if (!user || !withUserId) return;
    if (handledWith.current === withUserId) return;
    handledWith.current = withUserId;

    let cancelled = false;
    const open = async () => {
      try {
        const conversationId = await getOrCreateConversation(user.id, withUserId);
        // Refetch rather than search the current list: a brand-new conversation
        // is not in it yet, and the refetch is what supplies otherParticipant
        // for the chat header.
        const convos = await fetchConversations(user.id);
        if (cancelled) return;
        setConversations(convos);
        const found = convos.find((c) => c.id === conversationId) ?? null;
        if (found) setSelectedConversation(found);
      } catch (err) {
        console.error('[MessagesPage] failed to open ?with= conversation:', err);
      } finally {
        if (!cancelled) setLoadingConversations(false);
      }
    };
    void open();

    return () => {
      cancelled = true;
    };
  }, [user, withUserId]);

  // Realtime subscription for conversation updates (new convos, last_message_at changes)
  useEffect(() => {
    if (!user) return;

    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`conversations:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          // Refetch conversations on any change
          void fetchConversations(user.id).then(setConversations);
        },
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [user]);

  const selectedId = selectedConversation?.id ?? null;

  const refreshConversations = useCallback(() => {
    if (!user) return;
    void fetchConversations(user.id).then(setConversations);
  }, [user]);

  const clearUnreadForSelected = useCallback(() => {
    if (!selectedId) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === selectedId ? { ...c, unreadCount: 0 } : c)),
    );
  }, [selectedId]);

  const handleBackToList = () => {
    setSelectedConversation(null);
  };

  if (loading || !user) return null;

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-80px)]">
        {selectedConversation ? (
          <ConversationThread
            conversationId={selectedConversation.id}
            me={user.id}
            className="flex-1"
            onSeen={clearUnreadForSelected}
            onSent={refreshConversations}
            header={
              /* Chat Header */
              <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3 bg-white/95 backdrop-blur-sm">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBackToList}
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-3 flex-1">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={selectedConversation.otherParticipant?.avatarUrl || undefined} />
                    <AvatarFallback className="bg-gray-100 text-gray-900">
                      {selectedConversation.otherParticipant?.fullName?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {selectedConversation.otherParticipant?.fullName || 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            }
          />
        ) : (
          <>
            <PageHeader
              title="Messages"
              subtitle={`${conversations.length} conversation${conversations.length === 1 ? '' : 's'}`}
            />

            <ScrollArea className="flex-1 px-4 py-4">
              {loadingConversations ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-700 font-medium">No conversations yet</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Start a conversation to see it here
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map((convo) => {
                    const isUnread = convo.unreadCount > 0;
                    return (
                      <Card
                        key={convo.id}
                        className={`cursor-pointer hover:bg-gray-50 transition-colors ${isUnread ? 'bg-sky-50/50' : ''}`}
                        onClick={() => setSelectedConversation(convo)}
                      >
                        <CardContent className="p-3 flex items-center gap-3">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={convo.otherParticipant?.avatarUrl || undefined} />
                            <AvatarFallback className="bg-gray-100 text-gray-900">
                              {convo.otherParticipant?.fullName?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`font-medium ${isUnread ? 'text-gray-900' : 'text-gray-700'} truncate`}>
                                {convo.otherParticipant?.fullName || 'Unknown'}
                              </p>
                              {convo.lastMessage && (
                                <span className="text-xs text-gray-500 ml-2 shrink-0">
                                  {formatDistanceToNow(new Date(convo.lastMessage.createdAt), {
                                    addSuffix: true,
                                  })}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <p className={`text-sm ${isUnread ? 'text-gray-700 font-medium' : 'text-gray-500'} truncate`}>
                                {convo.lastMessage?.body || 'No messages yet'}
                              </p>
                              {isUnread && (
                                <Badge className="bg-sky-500 text-white ml-2 shrink-0">
                                  {convo.unreadCount}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </div>
    </MainLayout>
  );
}
