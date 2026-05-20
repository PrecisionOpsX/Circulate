import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  getConversationDetail,
  getMessages,
  otherPartyOf,
} from "@/lib/messaging";
import { formatCredits } from "@/lib/utils";
import { ConversationThread } from "@/components/messaging/ConversationThread";

export const metadata: Metadata = { title: "Conversation" };

type PageProps = { params: Promise<{ id: string }> };

export default async function ConversationPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireUser(`/messages/${id}`);
  const conversation = await getConversationDetail(id, user.id);

  if (!conversation) notFound();

  const messages = await getMessages(id);
  const other = otherPartyOf(conversation, user.id);
  const listing = conversation.listing;
  const cover = listing?.listing_photos
    ?.slice()
    .sort((a, b) => a.sort_order - b.sort_order)[0];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
      <nav className="mb-4 text-sm text-muted">
        <Link href="/messages" className="hover:text-foreground">
          Messages
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">
          {other?.display_name ?? "Conversation"}
        </span>
      </nav>

      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
        <Link
          href={other ? `/users/${other.id}` : "#"}
          className="flex items-center gap-3"
        >
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-brand-100 text-base font-semibold text-brand-700">
            {other?.avatar_url ? (
              <Image
                src={other.avatar_url}
                alt=""
                fill
                sizes="44px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center">
                {(other?.display_name ?? "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="font-semibold text-brand-900">
              {other?.display_name ?? "Unknown user"}
            </p>
            <p className="text-xs text-muted">View profile</p>
          </div>
        </Link>

        {listing && (
          <Link
            href={`/listings/${listing.id}`}
            className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2 text-sm transition-colors hover:border-brand-300"
          >
            {cover && (
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg">
                <Image
                  src={cover.url}
                  alt=""
                  fill
                  sizes="36px"
                  className="object-cover"
                />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-brand-900">
                {listing.title}
              </p>
              <p className="text-xs font-semibold text-circ-green">
                {formatCredits(listing.price)} credits
              </p>
            </div>
          </Link>
        )}
      </div>

      {/* Thread */}
      <ConversationThread
        conversationId={conversation.id}
        currentUserId={user.id}
        initialMessages={messages}
      />
    </div>
  );
}
