"use client";

/**
 * Messages tab — inventory rows 31 (list), 32 (input) and 33 (mark-as-read).
 *
 * Ported from `v1: src/app/clients/[id]/page.tsx:2377-2430`
 * (list `2380-2411`, input `2413-2427`, `h-[400px]` at `:2381`), with v1's
 * conversation memo `:297-305` and mark-as-read effect `:307-314`.
 *
 * The thread itself is `@/features/messaging`'s ConversationThread — the same
 * component `/messages` renders, so the two surfaces cannot drift. Mounting it
 * is what marks inbound messages seen, and this panel is only rendered while the
 * Messages tab is active, which reproduces v1's `activeTab === 'messages'` gate.
 */

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { ConversationThread, getOrCreateConversation } from "@/features/messaging";

export function MessagesPanel({
  me,
  clientId,
}: {
  me: string;
  clientId: string;
}) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const open = async () => {
      try {
        const id = await getOrCreateConversation(me, clientId);
        if (!cancelled) setConversationId(id);
      } catch (err) {
        console.error("[MessagesPanel] failed to open conversation:", err);
        if (!cancelled) setError("Could not open this conversation.");
      }
    };
    void open();
    return () => {
      cancelled = true;
    };
  }, [me, clientId]);

  return (
    <Card className="bg-white border-gray-200 shadow-sm">
      <CardContent className="p-0">
        {error ? (
          <div role="alert" className="h-[400px] flex items-center justify-center px-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : !conversationId ? (
          <div className="h-[400px] flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : (
          <ConversationThread
            conversationId={conversationId}
            me={me}
            className="h-[400px]"
          />
        )}
      </CardContent>
    </Card>
  );
}
