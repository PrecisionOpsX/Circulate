"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { markConversationReadAction } from "@/app/messages/actions";
import type { Message } from "@/lib/supabase/types";
import { MessageBubble } from "@/components/messaging/MessageBubble";
import { MessageInput } from "@/components/messaging/MessageInput";

type Props = {
  conversationId: string;
  currentUserId: string;
  initialMessages: Message[];
};

/**
 * Live chat thread. Subscribes to INSERTs on the `messages` table
 * filtered by conversation_id (via the supabase_realtime publication),
 * and appends new messages as they arrive. Marks the conversation as
 * read on mount so the unread badge clears.
 */
export function ConversationThread({
  conversationId,
  currentUserId,
  initialMessages,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const supabase = useMemo(() => createClient(), []);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Mark read once, on mount.
  useEffect(() => {
    void markConversationReadAction(conversationId);
  }, [conversationId]);

  // Live subscription. Tear down on unmount so changing conversation
  // doesn't leak channels.
  useEffect(() => {
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((prev) =>
            prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming],
          );
          // If the other person sent it, mark this conversation as read
          // again so the badge doesn't reappear while the page is open.
          if (incoming.sender_id !== currentUserId) {
            void markConversationReadAction(conversationId);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, supabase]);

  // Auto-scroll to the latest message whenever the list grows.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="flex h-full min-h-[60vh] flex-col rounded-2xl border border-border bg-background">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-muted">
            No messages yet. Say hi and start the conversation.
          </div>
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.id}
              body={m.body}
              createdAt={m.created_at}
              mine={m.sender_id === currentUserId}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <MessageInput conversationId={conversationId} />
    </div>
  );
}
