'use client';

/**
 * ConversationThread — the message bubble list + composer for one conversation.
 *
 * Extracted (not re-ported) from `src/app/(app)/messages/page.tsx`, which held
 * v1's thread inline: bubble list `:225-273`, composer `:275-302`, realtime
 * INSERT subscription `:105-143`, seen-marking `:80-89`. v1's own in-tab copy on
 * the client file is `v1: src/app/clients/[id]/page.tsx:2380-2427`
 * (list `2380-2411`, input `2413-2427`) — the same UI written twice. Extracting
 * gives both surfaces one implementation that cannot drift.
 *
 * Consumers supply the chrome: `/messages` passes a chat header, the client file
 * passes none (its page header already names the client) and a fixed height.
 */

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  fetchMessages,
  sendMessage,
  markConversationSeen,
  type MessageItem,
} from '../api/conversations';
import { getBrowserClient } from '@/lib/supabase';

export interface ConversationThreadProps {
  /** Conversation to render. */
  conversationId: string;
  /** The signed-in user's id — decides which side each bubble sits on. */
  me: string;
  /** Optional chrome above the bubbles (e.g. `/messages`' chat header). */
  header?: React.ReactNode;
  /** Height/size seam. `/messages` fills its flex column; the client file uses a fixed height. */
  className?: string;
  /** Fired after inbound messages are marked seen, so a list can clear its unread badge. */
  onSeen?: () => void;
  /** Fired after a message is sent, so a list can refresh its ordering/preview. */
  onSent?: () => void;
}

export function ConversationThread({
  conversationId,
  me,
  header,
  className,
  onSeen,
  onSent,
}: ConversationThreadProps) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Callbacks live in a ref so an inline arrow prop can't retrigger the loader.
  const callbacks = useRef({ onSeen, onSent });
  useEffect(() => {
    callbacks.current = { onSeen, onSent };
  }, [onSeen, onSent]);

  // Load messages + mark inbound as seen. Mounting this component IS the
  // "conversation opened" signal, which is how the client file satisfies v1's
  // `activeTab === 'messages'` mark-as-read effect (v1 `:307-314`).
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingMessages(true);
      try {
        const msgs = await fetchMessages(conversationId);
        if (cancelled) return;
        setMessages(msgs);
        await markConversationSeen(conversationId, me);
        if (cancelled) return;
        callbacks.current.onSeen?.();
      } catch (err) {
        console.error('[ConversationThread] failed to load messages:', err);
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [conversationId, me]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime subscription for new messages (cleaned up on unmount — messaging rule 2)
  useEffect(() => {
    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const newMsg = payload.new as unknown as MessageItem;
          setMessages((prev) => {
            // Dedupe by id (don't add if already present)
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Mark as seen if from other user
          if (newMsg.senderId !== me) {
            void markConversationSeen(conversationId, me).then(() =>
              callbacks.current.onSeen?.(),
            );
          }
        },
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [conversationId, me]);

  const handleSendMessage = async () => {
    const body = messageText.trim();
    if (!body || sendingMessage) return;

    setSendingMessage(true);
    setSendError(null);
    try {
      const newMsg = await sendMessage(conversationId, me, body);
      setMessages((prev) =>
        prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg],
      );
      setMessageText('');
      callbacks.current.onSent?.();
    } catch (err) {
      console.error('[ConversationThread] failed to send message:', err);
      // Surface the failure and KEEP the draft — v1 cleared the input and
      // toasted success before the write resolved, which is how messages
      // vanished (G-11).
      setSendError('Message not sent. Check your connection and try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className={cn('flex flex-col min-h-0', className)} data-testid="conversation-thread">
      {header}

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
                const isOwn = msg.senderId === me;
                return (
                  <div
                    key={msg.id}
                    data-testid="message-bubble"
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
        {sendError && (
          <p role="alert" className="text-xs text-red-600 mb-2">
            {sendError}
          </p>
        )}
        <div className="flex gap-2">
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
            aria-label="Message"
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
            aria-label="Send message"
          >
            {sendingMessage ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
