import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getListingDetail } from "@/lib/listing-queries";
import { coverPhoto, listingTypeLabel } from "@/lib/listings";
import { CREDIT_RULES } from "@/lib/constants";
import { isStripeEnabled } from "@/lib/env";
import { formatCredits } from "@/lib/utils";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PayConfirmForm } from "./PayConfirmForm";

export const metadata: Metadata = { title: "Confirm payment" };

type PageProps = { params: Promise<{ id: string }> };

export default async function PayPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireUser(`/pay/${id}`);
  const listing = await getListingDetail(id);

  if (!listing) notFound();

  // Sellers paying for their own listing makes no sense; bounce back.
  if (listing.seller_id === user.id) {
    redirect(`/listings/${id}`);
  }

  // Already sold or otherwise unavailable: show a friendly state.
  if (listing.status !== "active") {
    return (
      <Shell title={listing.title}>
        <Alert variant="warning">
          This listing is no longer available.
        </Alert>
        <Button asChild variant="secondary" className="mt-4">
          <Link href="/browse">Back to browse</Link>
        </Button>
      </Shell>
    );
  }

  // Buyer's current balance + projected post-trade balance.
  const supabase = await createClient();
  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", user.id)
    .single();
  const balance = wallet?.balance ?? 0;
  const projected = balance - listing.price;
  const notEnoughCredits = projected < 0;
  const cover = coverPhoto(listing);

  return (
    <Shell title="Confirm payment">
      {/* Listing summary */}
      <div className="flex gap-4 rounded-2xl border border-border bg-surface p-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-brand-50">
          {cover && (
            <Image
              src={cover}
              alt=""
              fill
              sizes="80px"
              className="object-cover"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <Badge variant={listing.type === "service" ? "blue" : "brand"}>
            {listingTypeLabel(listing.type)}
          </Badge>
          <h2 className="mt-1 line-clamp-1 font-semibold text-brand-900">
            {listing.title}
          </h2>
          <p className="text-xs text-muted">
            from{" "}
            <span className="font-medium text-foreground">
              {listing.seller?.display_name ?? "seller"}
            </span>
          </p>
        </div>
      </div>

      {/* Balance breakdown */}
      <div className="mt-4 rounded-2xl border border-border bg-surface p-4 text-sm">
        <Row label="Listing price" value={`- ${formatCredits(listing.price)}`} />
        <Row label="Your balance now" value={formatCredits(balance)} muted />
        <div className="mt-2 border-t border-border pt-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-brand-900">
              Balance after payment
            </span>
            <span
              className={`text-lg font-extrabold ${
                projected < 0 ? "text-danger" : "text-circ-green"
              }`}
            >
              {formatCredits(projected)}
            </span>
          </div>
        </div>
      </div>

      {notEnoughCredits ? (
        <div className="mt-4 space-y-3">
          <Alert variant="error">
            You don&apos;t have enough credits for this listing. Sell something
            to earn more, or buy a credit top-up.
          </Alert>
          <div className="flex gap-2">
            {isStripeEnabled && (
              <Button asChild>
                <Link href="/credits/buy">Buy credits</Link>
              </Button>
            )}
            <Button asChild variant="secondary">
              <Link href={`/listings/${id}`}>Back to listing</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          <PayConfirmForm listingId={listing.id} price={listing.price} />
          <Link
            href={`/listings/${id}`}
            className="block text-center text-sm font-medium text-muted hover:text-foreground"
          >
            Cancel
          </Link>
          <p className="text-center text-xs text-muted">
            A {Math.round(CREDIT_RULES.FEE_RATE * 100)}% platform fee will be
            deducted from the seller&apos;s side. You pay the full listing
            price.
          </p>
        </div>
      )}
    </Shell>
  );
}

function Shell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md flex-1 px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-brand-900">
        {title}
      </h1>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-muted">{label}</span>
      <span
        className={muted ? "text-muted" : "font-semibold text-foreground"}
      >
        {value}
      </span>
    </div>
  );
}
