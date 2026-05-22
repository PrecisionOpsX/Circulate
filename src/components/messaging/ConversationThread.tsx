"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  markConversationReadAction,
  sendMessageAction,
  type MessageState,
} from "@/app/messages/actions";
import type { Message } from "@/lib/supabase/types";
import { MessageBubble } from "@/components/messaging/MessageBubble";
import { MessageInput } from "@/components/messaging/MessageInput";

type Props = {
  conversationId: string;
  currentUserId: string;
  initialMessages: Message[];
};

/** A message that hasn't been confirmed yet, or that failed to send. */
type OptimisticMessage = Message & {
  /** Local-only flag: still in flight. */
  pending?: boolean;
  /** Local-only flag: server rejected the send. */
  failed?: boolean;
};

/**
 * Live chat thread.
 *
 * Sends are optimistic: the sender's own bubble appears the instant they
 * hit send, with a "Sending..." indicator. When the server confirms, the
 * temporary id is swapped for the real row id; the realtime echo of the
 * same INSERT is then deduped by id.
 *
 * Subscribes to INSERTs on `messages` filtered by conversation_id (via
 * the supabase_realtime publication) so the other party's messages and
 * the user's own messages from other tabs land live without a refresh.
 *
 * Marks the conversation as read on mount and after every incoming
 * message so the header bell clears while the thread is open.
 */
export function ConversationThread({
  conversationId,
  currentUserId,
  initialMessages,
}: Props) {
  const [messages, setMessages] = useState<OptimisticMessage[]>(initialMessages);
  const supabase = useMemo(() => createClient(), []);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Mark read once on mount, then refresh so the header bell re-syncs
  // to the updated server count.
  useEffect(() => {
    void markConversationReadAction(conversationId).then(() => {
      router.refresh();
    });
  }, [conversationId, router]);

  // Live subscription.
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
          setMessages((prev) => {
            // Already have this real id (either we just inserted it
            // ourselves and swapped the optimistic entry, or the same
            // event fired twice). Skip.
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
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

  const handleSend = useCallback(
    async (body: string): Promise<MessageState> => {
      const tempId = `pending-${crypto.randomUUID()}`;
      const optimistic: OptimisticMessage = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: currentUserId,
        body,
        viewed: false,
        created_at: new Date().toISOString(),
        pending: true,
      };
      setMessages((prev) => [...prev, optimistic]);

      const fd = new FormData();
      fd.set("conversationId", conversationId);
      fd.set("body", body);
      const result = await sendMessageAction({ ok: false }, fd);

      if (result.ok && result.message) {
        // Swap the temp row for the real one. If the realtime echo has
        // already added the real id, just drop the temp.
        setMessages((prev) => {
          const realId = result.message!.id;
          const hasReal = prev.some((m) => m.id === realId);
          if (hasReal) {
            return prev.filter((m) => m.id !== tempId);
          }
          return prev.map((m) => (m.id === tempId ? result.message! : m));
        });
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, pending: false, failed: true } : m,
          ),
        );
      }
      return result;
    },
    [conversationId, currentUserId],
  );

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
              status={m.pending ? "pending" : m.failed ? "failed" : undefined}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <MessageInput onSend={handleSend} />
    </div>
  );
}
