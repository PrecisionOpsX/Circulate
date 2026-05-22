"use client";

import Link from "next/link";
import { useUnreadCount } from "@/hooks/useUnreadCount";

type Props = {
  initialUnread: number;
  userId: string;
};

/**
 * Dashboard "Messages" quick-link card with a live unread count.
 *
 * The count updates in real time via the useUnreadCount hook (Realtime
 * INSERT/UPDATE subscriptions) so the card body reflects new messages
 * without a page refresh.
 */
export function DashboardMessagesCard({ initialUnread, userId }: Props) {
  const unread = useUnreadCount(initialUnread, userId);

  const body =
    unread > 0
      ? `${unread} unread ${unread === 1 ? "conversation" : "conversations"}.`
      : "No new messages.";

  return (
    <Link
      href="/messages"
      className={`relative rounded-2xl border bg-surface p-5 transition-colors hover:border-brand-300 hover:bg-brand-50 ${
        unread > 0
          ? "border-circ-blue ring-2 ring-circ-blue/20"
          : "border-border"
      }`}
    >
      {unread > 0 && (
        <span
          aria-hidden
          className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-danger"
        />
      )}
      <h3 className="font-medium">Messages</h3>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </Link>
  );
}
