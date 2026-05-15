import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getListingDetail, isFavorited } from "@/lib/listing-queries";
import { sortedPhotos, listingTypeLabel } from "@/lib/listings";
import { formatCredits } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { VerificationBadges } from "@/components/account/VerificationBadges";
import { PhotoGallery } from "@/components/listings/PhotoGallery";
import { FavoriteButton } from "@/components/listings/FavoriteButton";
import { ReportDialog } from "@/components/listings/ReportDialog";
import { OwnerControls } from "@/components/listings/OwnerControls";
import { ListingStatusBadge } from "@/components/listings/ListingStatusBadge";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingDetail(id);
  return { title: listing?.title ?? "Listing" };
}

export default async function ListingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [listing, user] = await Promise.all([
    getListingDetail(id),
    getSessionUser(),
  ]);

  if (!listing) notFound();

  const isOwner = user?.id === listing.seller_id;
  const favorited = await isFavorited(listing.id, user?.id ?? null);
  const photos = sortedPhotos(listing);
  const seller = listing.seller;
  const postedOn = new Date(listing.created_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <nav className="mb-5 text-sm text-muted">
        <Link href="/browse" className="hover:text-foreground">
          Browse
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">{listing.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Gallery + description */}
        <div className="space-y-6 lg:col-span-3">
          <PhotoGallery photos={photos} title={listing.title} />

          <section className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="text-base font-semibold text-brand-900">
              Description
            </h2>
            {listing.description ? (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {listing.description}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted">
                The seller didn&apos;t add a description.
              </p>
            )}
          </section>
        </div>

        {/* Info panel */}
        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={listing.type === "service" ? "blue" : "brand"}>
                {listingTypeLabel(listing.type)}
              </Badge>
              {listing.condition && (
                <Badge variant="neutral">{listing.condition.name}</Badge>
              )}
              {listing.status !== "active" && (
                <ListingStatusBadge status={listing.status} />
              )}
            </div>

            <h1 className="mt-3 text-2xl font-bold tracking-tight text-brand-900">
              {listing.title}
            </h1>
            <p className="mt-2 text-3xl font-extrabold text-circ-green">
              {formatCredits(listing.price)}
              <span className="ml-1.5 text-base font-semibold text-muted">
                credits
              </span>
            </p>

            <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
              <MetaRow
                label="Category"
                value={listing.category?.name ?? "Not specified"}
              />
              <MetaRow
                label="Location"
                value={listing.location?.name ?? "Not specified"}
              />
              <MetaRow
                label="Condition"
                value={listing.condition?.name ?? "Not applicable"}
              />
              <MetaRow label="Posted" value={postedOn} />
            </dl>

            <div className="mt-5 border-t border-border pt-5">
              {isOwner ? (
                <OwnerControls listingId={listing.id} status={listing.status} />
              ) : (
                <div className="space-y-3">
                  <Button
                    type="button"
                    size="lg"
                    variant="gradient"
                    className="w-full"
                    disabled
                    title="In-app messaging arrives in Milestone 4"
                  >
                    Message seller
                  </Button>
                  <p className="text-center text-xs text-muted">
                    In-app messaging and credit checkout arrive in upcoming
                    milestones.
                  </p>
                  <FavoriteButton
                    listingId={listing.id}
                    initialFavorited={favorited}
                    isAuthenticated={Boolean(user)}
                    variant="button"
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Seller */}
          {seller && (
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="text-sm font-semibold text-muted">Seller</h2>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-lg font-semibold text-brand-700">
                  {seller.avatar_url ? (
                    <Image
                      src={seller.avatar_url}
                      alt=""
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    seller.display_name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="font-semibold text-brand-900">
                    {seller.display_name}
                  </p>
                  <p className="text-xs text-muted">
                    {seller.completed_trades} completed trade
                    {seller.completed_trades === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <VerificationBadges
                  emailVerified={seller.email_verified}
                  phoneVerified={seller.phone_verified}
                />
              </div>
            </div>
          )}

          {!isOwner && (
            <div className="px-1">
              <ReportDialog
                listingId={listing.id}
                isAuthenticated={Boolean(user)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}
