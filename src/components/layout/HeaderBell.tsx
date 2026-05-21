"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/supabase/types";

type Props = {
  /** Unread-conversation count rendered server-side; used as the
   *  initial value and re-applied whenever it changes on navigation. */
  initialUnread: number;
  userId: string;
};

/**
 * Messages bell in the header. Renders the unread badge live by
 * subscribing to INSERTs on `messages` (RLS limits the events to
 * conversations the user is a participant in).
 *
 * - Increments when a message arrives from someone other than the user.
 * - Skips messages in the conversation the user is currently viewing.
 * - Clears to 0 when the user navigates to /messages or a specific
 *   conversation page (those views mark the relevant rows as read).
 * - Re-syncs to the server-provided count when props update on
 *   subsequent navigations.
 */
export function HeaderBell({ initialUnread, userId }: Props) {
  const [unread, setUnread] = useState(initialUnread);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Re-sync with the server-provided count whenever it changes (e.g.,
  // after a route navigation re-renders Header on the server).
  useEffect(() => {
    queueMicrotask(() => setUnread(initialUnread));
  }, [initialUnread]);

  // Clear the badge as soon as the user lands on any /messages route.
  // The server-side mark-as-read happens via the conversation page
  // itself; this keeps the badge in sync without a refresh.
  useEffect(() => {
    if (pathname === "/messages" || pathname.startsWith("/messages/")) {
      queueMicrotask(() => setUnread(0));
      router.refresh();
    }
  }, [pathname, router]);

  // Live subscription. RLS on `messages` filters the channel to rows the
  // signed-in user can SELECT, i.e. messages in conversations they're a
  // part of.
  useEffect(() => {
    const channel = supabase
      .channel(`header-bell:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as Message;
          if (m.sender_id === userId) return;
          // Ignore messages in the conversation the user is currently
          // looking at; the thread page is marking them read live.
          if (pathname === `/messages/${m.conversation_id}`) return;
          setUnread((prev) => prev + 1);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, pathname, supabase]);

  const ariaLabel = unread > 0 ? `Messages, ${unread} unread` : "Messages";

  return (
    <Link
      href="/messages"
      aria-label={ariaLabel}
      className="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-brand-50 hover:text-brand-800"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
      </svg>
      {unread > 0 && (
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white ring-2 ring-surface"
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
