import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RatingForm } from "@/components/ratings/RatingForm";

export const metadata: Metadata = { title: "Rate your trade" };

type PageProps = { params: Promise<{ id: string }> };

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

export default async function RateTransactionPage({ params }: PageProps) {
  const { id } = await params;
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
      </div>
    </div>
  );
}
