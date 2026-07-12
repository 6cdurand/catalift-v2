'use client';

/**
 * /messages — Messages screen (F2 port from v1)
 *
 * Conversation list + thread view + composer. Verbatim UI port from v1,
 * rewired to v2 data layer (fetchConversations, fetchMessages, sendMessage).
 *
 * RLS enforces participant-only access. Realtime updates via postgres_changes
 * subscription (or refetch fallback if tables not in publication).
 */

import { useEffect, useState, useRef } from 'react';
import { useSession } from '@/features/auth';
import { MainLayout, PageHeader } from '@/components/layouts/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle,
  Send,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  fetchConversations,
  fetchMessages,
  sendMessage,
  markConversationSeen,
  type ConversationItem,
  type MessageItem,
} from '@/features/messaging/api/conversations';
import { getBrowserClient } from '@/lib/supabase';

export default function MessagesPage() {
  const { user, loading } = useSession();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Load messages when conversation selected
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }
    const load = async () => {
      setLoadingMessages(true);
      try {
        const msgs = await fetchMessages(selectedConversation.id);
        setMessages(msgs);
        if (user) {
          // Mark conversation as seen
          await markConversationSeen(selectedConversation.id, user.id);
          // Update local unread count
          setConversations((prev) =>
            prev.map((c) =>
              c.id === selectedConversation.id ? { ...c, unreadCount: 0 } : c,
            ),
          );
        }
      } catch (err) {
        console.error('[MessagesPage] failed to load messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    };
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation?.id, user]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!user || !selectedConversation) return;

    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`messages:${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const newMsg = payload.new as unknown as MessageItem;
          setMessages((prev) => {
            // Dedupe by id (don't add if already present)
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Mark as seen if from other user
          if (newMsg.senderId !== user.id) {
            void markConversationSeen(selectedConversation.id, user.id);
            setConversations((prev) =>
              prev.map((c) =>
                c.id === selectedConversation.id ? { ...c, unreadCount: 0 } : c,
              ),
            );
          }
        },
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [user, selectedConversation]);

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

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation || !user) return;

    setSendingMessage(true);
    try {
      const newMsg = await sendMessage(
        selectedConversation.id,
        user.id,
        messageText.trim(),
      );
      setMessages((prev) => [...prev, newMsg]);
      setMessageText('');
      // Update conversation list (last_message_at changed)
      const updatedConvos = await fetchConversations(user.id);
      setConversations(updatedConvos);
    } catch (err) {
      console.error('[MessagesPage] failed to send message:', err);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
    setMessages([]);
  };

  if (loading || !user) return null;

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-80px)]">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3 bg-white/95 backdrop-blur-sm">
              <Button variant="ghost" size="icon" onClick={handleBackToList}>
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

            {/* Messages */}
            <ScrollArea className="flex-1 px-4 py-4">
              {loadingMessages ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No messages yet</p>
                      <p className="text-sm text-gray-400">
                        Send a message to start the conversation
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOwn = msg.senderId === user.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                              isOwn
                                ? 'bg-sky-500 text-white rounded-br-md'
                                : 'bg-gray-100 text-gray-900 rounded-bl-md'
                            }`}
                          >
                            <p className="text-sm">{msg.body}</p>
                            <div
                              className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}
                            >
                              <span
                                className={`text-xs ${isOwn ? 'text-sky-200' : 'text-gray-500'}`}
                              >
                                {format(new Date(msg.createdAt), 'HH:mm')}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Composer */}
            <div className="px-4 py-3 border-t border-gray-200 bg-white/95 backdrop-blur-sm">
              <div className="flex gap-2">
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSendMessage();
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sendingMessage}
                  size="icon"
                >
                  {sendingMessage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
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
