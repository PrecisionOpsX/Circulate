import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getRatingsForUser,
  isUserBlocked,
} from "@/lib/ratings";
import { LISTING_SELECT, type ListingWithRelations } from "@/lib/listings";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { TrustBadges } from "@/components/account/TrustBadges";
import { BlockButton } from "@/components/account/BlockButton";
import { ReportUserDialog } from "@/components/account/ReportUserDialog";
import { RatingStars } from "@/components/ratings/RatingStars";
import { ListingCard } from "@/components/listings/ListingCard";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ rated?: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", id)
    .maybeSingle();
  return { title: data?.display_name ?? "Profile" };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function UserProfilePage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { rated } = await searchParams;
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createClient();
  const me = await getSessionUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!profile) notFound();

  const isSelf = me?.id === profile.id;
  const [ratings, blocked] = await Promise.all([
    getRatingsForUser(profile.id),
    me && !isSelf ? isUserBlocked(me.id, profile.id) : Promise.resolve(false),
  ]);

  // Public-facing listings (active only) from this user, latest first.
  const { data: listingsData } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("seller_id", profile.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(8)
    .returns<ListingWithRelations[]>();
  const listings = listingsData ?? [];

  const initial = profile.display_name.charAt(0).toUpperCase();
  const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:py-10">
      {rated && (
        <div className="mb-5">
          <Alert variant="success">
            Thanks for rating. Your feedback helps the community trust each
            other.
          </Alert>
        </div>
      )}

      <header className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-3xl font-semibold text-brand-700">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt=""
              fill
              sizes="96px"
              className="object-cover"
              unoptimized
            />
          ) : (
            initial
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-brand-900">
            {profile.display_name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Member since {memberSince} &middot; {profile.completed_trades}{" "}
            completed trade{profile.completed_trades === 1 ? "" : "s"}
          </p>
          {profile.rating_count > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <RatingStars value={profile.rating_avg} size="md" />
              <span className="text-sm font-medium text-foreground">
                {profile.rating_avg.toFixed(1)}
              </span>
              <span className="text-sm text-muted">
                ({profile.rating_count})
              </span>
            </div>
          )}
          <div className="mt-3">
            <TrustBadges
              emailVerified={profile.email_verified}
              phoneVerified={profile.phone_verified}
              completedTrades={profile.completed_trades}
              ratingAvg={profile.rating_avg}
              ratingCount={profile.rating_count}
            />
          </div>
        </div>
      </header>

      {profile.bio && (
        <section className="mt-6 rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm leading-relaxed text-foreground">
            {profile.bio}
          </p>
        </section>
      )}

      {/* Listings */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-brand-900">
          Active listings
        </h2>
        <div className="mt-4">
          {listings.length === 0 ? (
            <EmptyState
              title={
                isSelf
                  ? "You don't have any active listings"
                  : "No active listings"
              }
              description={
                isSelf
                  ? "Post something to get started."
                  : "Check back later or browse the full marketplace."
              }
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  isAuthenticated={Boolean(me)}
                  isFavorited={false}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Reviews */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-brand-900">Reviews</h2>
        {ratings.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No reviews yet.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {ratings.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl border border-border bg-surface p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                    {r.rater?.avatar_url ? (
                      <Image
                        src={r.rater.avatar_url}
                        alt=""
                        fill
                        sizes="36px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center">
                        {(r.rater?.display_name ?? "?")
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-brand-900">
                        {r.rater?.display_name ?? "User"}
                      </p>
                      <RatingStars value={r.stars} size="sm" />
                    </div>
                    <p className="text-xs text-muted">
                      {new Date(r.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                {r.review && (
                  <p className="mt-3 text-sm leading-relaxed text-foreground">
                    {r.review}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Actions */}
      {me && !isSelf && (
        <section className="mt-10 flex flex-wrap items-center gap-4 border-t border-border pt-6">
          <BlockButton
            targetUserId={profile.id}
            initialBlocked={blocked}
          />
          <ReportUserDialog
            userId={profile.id}
            isAuthenticated={Boolean(me)}
          />
        </section>
      )}

      {isSelf && (
        <section className="mt-10 flex items-center gap-3 border-t border-border pt-6">
          <Badge variant="brand">This is you</Badge>
          <Link
            href="/profile"
            className="text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            Edit your profile
          </Link>
        </section>
      )}
    </div>
  );
}
