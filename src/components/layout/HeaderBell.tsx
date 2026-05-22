"use client";

import Link from "next/link";
import { useUnreadCount } from "@/hooks/useUnreadCount";

type Props = {
  /** Unread-conversation count rendered server-side; used as the
   *  initial value and kept live via Realtime INSERT/UPDATE events. */
  initialUnread: number;
  userId: string;
};

/**
 * Messages bell in the header.
 *
 * The badge count is kept accurate in real time:
 *  - Increments when a new message arrives from another user (INSERT).
 *  - Re-fetches the true count when any message is marked as viewed
 *    (UPDATE), so the badge clears the instant a conversation is read.
 *  - Skips incrementing for messages in the conversation the user is
 *    currently viewing (ConversationThread handles those immediately).
 *
 * Uses useUnreadCount which queries the DB directly via the client
 * session -- no dependency on router.refresh() or prop changes.
 */
export function HeaderBell({ initialUnread, userId }: Props) {
  const unread = useUnreadCount(initialUnread, userId);
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
