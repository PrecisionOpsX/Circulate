import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getMyConversations, otherPartyOf } from "@/lib/messaging";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await requireUser("/messages");
  const conversations = await getMyConversations(user.id);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-brand-900">
          Messages
        </h1>
        <p className="mt-1 text-sm text-muted">
          Conversations with buyers and sellers, kept in sync in real time.
        </p>
      </header>

      {conversations.length === 0 ? (
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
            </svg>
          }
          title="No conversations yet"
          description="Message a seller from any listing to start a thread."
          action={
            <Button asChild>
              <Link href="/browse">Browse the marketplace</Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {conversations.map((c) => {
            const other = otherPartyOf(c, user.id);
            const cover = c.listing?.listing_photos
              ?.slice()
              .sort((a, b) => a.sort_order - b.sort_order)[0];
            const when = c.last_message_at
              ? new Date(c.last_message_at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })
              : null;
            return (
              <li key={c.id}>
                <Link
                  href={`/messages/${c.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-brand-50"
                >
                  {/* Avatar */}
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-brand-100 text-base font-semibold text-brand-700">
                    {other?.avatar_url ? (
                      <Image
                        src={other.avatar_url}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center">
                        {(other?.display_name ?? "?").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Text block */}
                  <div className="min-w-0 flex-1">
                    {/* Row 1: name + badge + timestamp */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="truncate font-semibold text-brand-900">
                          {other?.display_name ?? "Unknown user"}
                        </p>
                        {c.unread && <Badge variant="blue">New</Badge>}
                      </div>
                      {c.last_message_at && (
                        <p className="shrink-0 text-xs text-muted">{when}</p>
                      )}
                    </div>
                    {/* Row 2: latest message preview or fallback */}
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {c.latestMessage
                        ? c.latestMessage.body
                        : `${c.listing?.title ?? "(listing removed)"} · No messages yet`}
                    </p>
                  </div>

                  {/* Listing thumbnail */}
                  {cover && (
                    <div className="relative hidden h-12 w-12 shrink-0 overflow-hidden rounded-lg sm:block">
                      <Image
                        src={cover.url}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
