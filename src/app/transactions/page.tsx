import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCredits } from "@/lib/utils";
import { CREDIT_RULES } from "@/lib/constants";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type {
  CreditPurchase,
  Transaction,
} from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Transactions" };

type TxnWithListing = Transaction & {
  listing: { id: string; title: string } | null;
};

type Entry =
  | {
      kind: "trade-buy" | "trade-sell";
      when: string;
      id: string;
      txn: TxnWithListing;
    }
  | {
      kind: "purchase";
      when: string;
      id: string;
      purchase: CreditPurchase;
    };

export default async function TransactionsPage() {
  const user = await requireUser("/transactions");
  const supabase = await createClient();

  const [walletRes, tradesRes, purchasesRes] = await Promise.all([
    supabase.from("wallets").select("balance").eq("user_id", user.id).single(),
    supabase
      .from("transactions")
      .select("*, listing:listings(id, title)")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .returns<TxnWithListing[]>(),
    supabase
      .from("credit_purchases")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false }),
  ]);

  const balance = walletRes.data?.balance ?? 0;
  const trades = tradesRes.data ?? [];
  const purchases = purchasesRes.data ?? [];

  const entries: Entry[] = [
    ...trades.map<Entry>((txn) => ({
      kind: txn.buyer_id === user.id ? "trade-buy" : "trade-sell",
      when: txn.completed_at ?? txn.created_at,
      id: `t-${txn.id}`,
      txn,
    })),
    ...purchases.map<Entry>((purchase) => ({
      kind: "purchase",
      when: purchase.completed_at ?? purchase.created_at,
      id: `p-${purchase.id}`,
      purchase,
    })),
  ].sort((a, b) => +new Date(b.when) - +new Date(a.when));

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-900">
            Transactions
          </h1>
          <p className="mt-1 text-sm text-muted">
            Every credit movement on your account.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface px-5 py-3">
          <p className="text-xs text-muted">Current balance</p>
          <p
            className={`mt-0.5 text-2xl font-extrabold ${
              balance < 0 ? "text-danger" : "text-circ-green"
            }`}
          >
            {formatCredits(balance)}
          </p>
        </div>
      </header>

      <div className="mt-8">
        {entries.length === 0 ? (
          <EmptyState
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            }
            title="No transactions yet"
            description="Buy something, sell something, or top up your wallet to see activity here."
            action={
              <div className="flex gap-2">
                <Button asChild>
                  <Link href="/browse">Browse marketplace</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/credits/buy">Buy credits</Link>
                </Button>
              </div>
            }
          />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {entries.map((entry) => (
              <li key={entry.id}>
                <EntryRow entry={entry} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-6 text-xs text-muted">
        Platform fee: {Math.round(CREDIT_RULES.FEE_RATE * 100)}% of each sale,
        deducted from the seller&apos;s side and held in the community reserve.
      </p>
    </div>
  );
}

function EntryRow({ entry }: { entry: Entry }) {
  const when = new Date(entry.when).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  if (entry.kind === "purchase") {
    const { purchase } = entry;
    return (
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <Badge variant="blue">Bought credits</Badge>
          <p className="mt-1.5 font-medium text-brand-900">
            Top-up via Stripe
          </p>
          <p className="text-xs text-muted">
            ${(purchase.amount_usd_cents / 100).toFixed(2)} USD &middot; {when}
          </p>
        </div>
        <span className="shrink-0 text-lg font-extrabold text-circ-green">
          + {formatCredits(purchase.credits)}
        </span>
      </div>
    );
  }

  const { txn } = entry;
  const isBuy = entry.kind === "trade-buy";
  const listingTitle = txn.listing?.title ?? "Removed listing";

  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <Badge variant={isBuy ? "neutral" : "green"}>
          {isBuy ? "Bought" : "Sold"}
        </Badge>
        <p className="mt-1.5 truncate font-medium text-brand-900">
          {txn.listing ? (
            <Link
              href={`/listings/${txn.listing.id}`}
              className="hover:text-circ-blue"
            >
              {listingTitle}
            </Link>
          ) : (
            listingTitle
          )}
        </p>
        <p className="text-xs text-muted">
          {when}
          {!isBuy && (
            <>
              {" "}&middot; fee {formatCredits(txn.fee_amount)} credits
            </>
          )}
        </p>
      </div>
      <span
        className={`shrink-0 text-lg font-extrabold ${
          isBuy ? "text-danger" : "text-circ-green"
        }`}
      >
        {isBuy ? "- " : "+ "}
        {formatCredits(isBuy ? txn.gross_amount : txn.net_amount)}
      </span>
    </div>
  );
}
