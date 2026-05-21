import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RatingForm } from "@/components/ratings/RatingForm";

export const metadata: Metadata = { title: "Rate your trade" };

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ listing?: string }>;
};

type TxnWithParties = {
  id: string;
  status: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string | null;
  listing: { id: string; title: string } | null;
  buyer: { id: string; display_name: string } | null;
  seller: { id: string; display_name: string } | null;
};

export default async function RateTransactionPage({
  params,
  searchParams,
}: PageProps) {
  const [{ id }, { listing: listingHint }] = await Promise.all([
    params,
    searchParams,
  ]);
  const user = await requireUser(`/transactions/${id}/rate`);
  const supabase = await createClient();

  const { data: txn } = await supabase
    .from("transactions")
    .select(
      "id, status, buyer_id, seller_id, listing_id, " +
        "listing:listings(id, title), " +
        "buyer:profiles!buyer_id(id, display_name), " +
        "seller:profiles!seller_id(id, display_name)",
    )
    .eq("id", id)
    .maybeSingle()
    .returns<TxnWithParties>();

  if (!txn) notFound();
  if (txn.status !== "completed") {
    redirect("/transactions");
  }

  const isBuyer = txn.buyer_id === user.id;
  const isSeller = txn.seller_id === user.id;
  if (!isBuyer && !isSeller) notFound();

  const ratee = isBuyer ? txn.seller : txn.buyer;
  if (!ratee) notFound();

  // Already rated? Send them to the ratee profile.
  const { data: existing } = await supabase
    .from("ratings")
    .select("id")
    .eq("transaction_id", txn.id)
    .eq("rater_id", user.id)
    .maybeSingle();
  if (existing) redirect(`/users/${ratee.id}`);

  // Where to send the user if they choose to skip. Prefer the listing
  // (post-purchase flow passes its id in the query string); otherwise
  // fall back to the listing on the txn, then the transactions list.
  const skipHref = listingHint
    ? `/listings/${listingHint}?paid=1`
    : txn.listing_id
      ? `/listings/${txn.listing_id}?paid=1`
      : "/transactions";

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
      <nav className="mb-5 text-sm text-muted">
        <Link href="/transactions" className="hover:text-foreground">
          Transactions
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">Rate trade</span>
      </nav>

      <h1 className="text-2xl font-bold tracking-tight text-brand-900">
        Rate your trade
      </h1>
      <p className="mt-1 text-sm text-muted">
        {txn.listing
          ? `Your trade for "${txn.listing.title}" with ${ratee.display_name}.`
          : `Your trade with ${ratee.display_name}.`}
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
        <RatingForm
          transactionId={txn.id}
          rateeName={ratee.display_name}
        />
        <div className="mt-5 border-t border-border pt-4 text-center">
          <Link
            href={skipHref}
            className="text-sm font-medium text-muted hover:text-foreground"
          >
            Skip for now
          </Link>
        </div>
      </div>
    </div>
  );
}
