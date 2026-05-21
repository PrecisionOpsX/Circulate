import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CREDIT_RULES } from "@/lib/constants";
import { formatCredits } from "@/lib/utils";
import { getPendingRatings, getRatingsForUser } from "@/lib/ratings";
import { getMyUnreadCount } from "@/lib/messaging";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { VerificationBadges } from "@/components/account/VerificationBadges";
import { RatingStars } from "@/components/ratings/RatingStars";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { id, profile } = await requireUser("/dashboard");

  const supabase = await createClient();
  const [
    walletRes,
    listingsRes,
    favoritesRes,
    unreadCount,
    pendingRatings,
    receivedRatings,
  ] = await Promise.all([
    supabase.from("wallets").select("balance").eq("user_id", id).single(),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", id)
      .eq("status", "active"),
    supabase
      .from("favorites")
      .select("id", { count: "exact", head: true })
      .eq("user_id", id),
    getMyUnreadCount(id),
    getPendingRatings(id),
    getRatingsForUser(id),
  ]);

  const wallet = walletRes.data;
  const activeListings = listingsRes.count ?? 0;
  const savedCount = favoritesRes.count ?? 0;
  const balance = wallet?.balance ?? 0;
  const isEmpty = balance <= 0;
  const fullyVerified = profile.email_verified && profile.phone_verified;
  const latestRatings = receivedRatings.slice(0, 3);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">
          Welcome back, {profile.display_name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Here&apos;s an overview of your Circulate account.
        </p>
      </header>

      {/* Wallet */}
      <section className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Credit balance</p>
            <p className="mt-1 text-4xl font-bold text-brand-600">
              {formatCredits(balance)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="gradient">
              <Link href="/credits/buy">+ Buy credits</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href="/transactions">History</Link>
            </Button>
          </div>
        </div>
        {isEmpty && (
          <div className="mt-4">
            <Alert variant="warning">
              You&apos;re out of credits. Sell a listing to earn some, or buy
              credits to keep trading.
            </Alert>
          </div>
        )}
        <p className="mt-3 text-xs text-muted">
          A {Math.round(CREDIT_RULES.FEE_RATE * 100)}% platform fee is taken
          from each sale.
        </p>
      </section>

      {/* Pending ratings */}
      {pendingRatings.length > 0 && (
        <section className="rounded-2xl border border-gold-200 bg-gold-50 p-6">
          <h2 className="text-lg font-semibold text-brand-900">
            Rate your recent trade
            {pendingRatings.length === 1 ? "" : "s"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Your feedback helps the next person trust the community.
          </p>
          <ul className="mt-4 space-y-2">
            {pendingRatings.slice(0, 3).map((p) => (
              <li
                key={p.transactionId}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-brand-900">
                    {p.listingTitle ?? "Removed listing"}
                  </p>
                  <p className="text-xs text-muted">
                    {p.role === "buyer" ? "Bought from" : "Sold to"}{" "}
                    {p.otherParty?.display_name ?? "user"}
                  </p>
                </div>
                <Button asChild size="sm" variant="gold">
                  <Link href={`/transactions/${p.transactionId}/rate`}>
                    Rate
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Recent ratings received */}
      {latestRatings.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Recent reviews</h2>
              {profile.rating_count > 0 && (
                <div className="mt-1 flex items-center gap-2">
                  <RatingStars value={profile.rating_avg} size="sm" />
                  <span className="text-xs text-muted">
                    <span className="font-semibold text-brand-900">
                      {profile.rating_avg.toFixed(1)}
                    </span>{" "}
                    from {profile.rating_count}{" "}
                    {profile.rating_count === 1 ? "rating" : "ratings"}
                  </span>
                </div>
              )}
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link href="/profile">See all</Link>
            </Button>
          </div>
          <ul className="mt-4 space-y-4">
            {latestRatings.map((r) => (
              <li
                key={r.id}
                className="border-b border-border pb-4 last:border-b-0 last:pb-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                      {r.rater?.avatar_url ? (
                        <Image
                          src={r.rater.avatar_url}
                          alt=""
                          width={32}
                          height={32}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : (
                        (r.rater?.display_name ?? "?").charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-brand-900">
                        {r.rater?.display_name ?? "A trade partner"}
                      </p>
                      <RatingStars value={r.stars} size="sm" />
                    </div>
                  </div>
                  <p className="text-xs text-muted">
                    {new Date(r.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                {r.review && (
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-foreground">
                    {r.review}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Verification status */}
      <section className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Account verification</h2>
            <p className="mt-1 text-sm text-muted">
              {fullyVerified
                ? "Your account is fully verified. Buyers and sellers can trust you."
                : "Complete verification to build trust with the community."}
            </p>
          </div>
          {!fullyVerified && (
            <Button asChild size="sm" variant="secondary">
              <Link href="/settings">Finish setup</Link>
            </Button>
          )}
        </div>
        <div className="mt-4">
          <VerificationBadges
            emailVerified={profile.email_verified}
            phoneVerified={profile.phone_verified}
          />
        </div>
      </section>

      {/* Quick actions */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink
          href="/listings/new"
          title="Create a listing"
          body="Post goods or a service for credits."
        />
        <QuickLink
          href="/messages"
          title="Messages"
          body={
            unreadCount > 0
              ? `${unreadCount} unread ${unreadCount === 1 ? "conversation" : "conversations"}.`
              : "No new messages."
          }
          highlight={unreadCount > 0}
        />
        <QuickLink
          href="/listings/mine"
          title="My listings"
          body={`${activeListings} active listing${activeListings === 1 ? "" : "s"}.`}
        />
        <QuickLink
          href="/favorites"
          title="Saved listings"
          body={`${savedCount} listing${savedCount === 1 ? "" : "s"} saved.`}
        />
      </section>
    </div>
  );
}

function QuickLink({
  href,
  title,
  body,
  highlight,
}: {
  href: string;
  title: string;
  body: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`relative rounded-2xl border bg-surface p-5 transition-colors hover:border-brand-300 hover:bg-brand-50 ${
        highlight ? "border-circ-blue ring-2 ring-circ-blue/20" : "border-border"
      }`}
    >
      {highlight && (
        <span
          aria-hidden
          className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-danger"
        />
      )}
      <h3 className="font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </Link>
  );
}
