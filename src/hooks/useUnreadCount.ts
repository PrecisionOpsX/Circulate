"use client";

/**
 * Tracks the number of conversations with at least one unread message
 * for the signed-in user.
 *
 * Starts from the server-rendered `initialUnread` value and stays live
 * via two Supabase Realtime listeners:
 *
 *  - INSERT on messages: a new message arrived from someone else. If the
 *    user is currently viewing that conversation (pathname check) we skip
 *    the increment -- the ConversationThread will mark it read immediately.
 *    Otherwise we re-fetch the true count from the DB.
 *
 *  - UPDATE on messages: a message was marked as viewed=true (i.e. the
 *    markConversationReadAction ran). We re-fetch the count so the badge
 *    clears as soon as the read is committed.
 *
 * Both events call the same fetchCount() which queries the DB directly
 * via the client session (SELECT is allowed by the messages RLS policy).
 * This avoids the router.refresh() race where initialUnread stays 0 both
 * before and after the refresh, so the useEffect dep never fires.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/supabase/types";

export function useUnreadCount(initialUnread: number, userId: string): number {
  const [unread, setUnread] = useState(initialUnread);
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  // Each hook instance needs a distinct channel name. Multiple components
  // (e.g. HeaderBell + DashboardMessagesCard) may be mounted on the same
  // page with the same userId -- sharing a name causes Supabase to return
  // the already-subscribed channel and throw when .on() is called again.
  const channelName = useRef(`unread-count:${userId}:${crypto.randomUUID()}`).current;

  // Keep in sync with server-provided value on hard refresh / navigation.
  useEffect(() => {
    queueMicrotask(() => setUnread(initialUnread));
  }, [initialUnread]);

  useEffect(() => {
    // Query the same column the server uses: unread messages from others.
    const fetchCount = async () => {
      const { data } = await supabase
        .from("messages")
        .select("conversation_id")
        .eq("viewed", false)
        .neq("sender_id", userId);
      setUnread(new Set((data ?? []).map((m) => m.conversation_id)).size);
    };

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as Message;
          // Own messages never count as unread.
          if (m.sender_id === userId) return;
          // Skip messages in the conversation currently on screen;
          // ConversationThread marks them read right away.
          if (pathname === `/messages/${m.conversation_id}`) return;
          void fetchCount();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        () => {
          // A message was marked viewed -- re-query for the accurate count.
          void fetchCount();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, pathname, supabase, channelName]);

  return unread;
}
