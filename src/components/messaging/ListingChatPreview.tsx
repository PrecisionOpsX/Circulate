import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import type { ListingConversationPreview } from "@/lib/messaging";

type Props = {
  conversations: ListingConversationPreview[];
  currentUserId: string;
  /** Whether the current user is the seller of this listing. */
  isOwner: boolean;
};

/**
 * Compact summary of the conversations this user has on the current
 * listing. Sellers see every buyer who has reached out; buyers see
 * their own thread (if they've already started one).
 */
export function ListingChatPreview({
  conversations,
  currentUserId,
  isOwner,
}: Props) {
  if (conversations.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-brand-900">
          {isOwner ? "Conversations on this listing" : "Your conversation"}
        </h2>
        <Button asChild size="sm" variant="ghost">
          <Link href="/messages">All messages</Link>
        </Button>
      </div>

      <ul className="mt-3 divide-y divide-border">
        {conversations.slice(0, 3).map((c) => {
          const other =
            c.buyer_id === currentUserId ? c.seller : c.buyer;
          const initial = (other?.display_name ?? "?")
            .charAt(0)
            .toUpperCase();
          const previewBody =
            c.latestMessage?.body ?? "No messages yet";
          const isFromMe =
            c.latestMessage?.sender_id === currentUserId;
          const when = c.latestMessage?.created_at ?? c.created_at;
          const time = new Date(when).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          });
          return (
            <li key={c.id}>
              <Link
                href={`/messages/${c.id}`}
                className="flex items-start gap-3 py-3 transition-colors hover:bg-brand-50/40"
              >
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                  {other?.avatar_url ? (
                    <Image
                      src={other.avatar_url}
                      alt=""
                      fill
                      sizes="40px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    initial
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-brand-900">
                      {other?.display_name ?? "Unknown user"}
                    </p>
                    {c.unread && (
                      <span
                        aria-label="Unread"
                        className="h-2 w-2 shrink-0 rounded-full bg-danger"
                      />
                    )}
                  </div>
                  <p className="line-clamp-1 text-xs text-muted">
                    {isFromMe && "You: "}
                    {previewBody}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted/80">{time}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {conversations.length > 3 && (
        <p className="mt-3 text-xs text-muted">
          Plus {conversations.length - 3} more in your inbox.
        </p>
      )}
    </section>
  );
}
