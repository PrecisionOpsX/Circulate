import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CREDIT_RULES } from "@/lib/constants";
import { formatCredits } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { VerificationBadges } from "@/components/account/VerificationBadges";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { id, profile } = await requireUser("/dashboard");

  const supabase = await createClient();
  const [walletRes, listingsRes, favoritesRes] = await Promise.all([
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
  ]);

  const wallet = walletRes.data;
  const activeListings = listingsRes.count ?? 0;
  const savedCount = favoritesRes.count ?? 0;
  const balance = wallet?.balance ?? CREDIT_RULES.STARTING_BALANCE;
  const isNegative = balance < 0;
  const fullyVerified = profile.email_verified && profile.phone_verified;

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
        <p className="text-sm text-muted">Credit balance</p>
        <p
          className={`mt-1 text-4xl font-bold ${
            isNegative ? "text-danger" : "text-brand-600"
          }`}
        >
          {formatCredits(balance)}
        </p>
        {isNegative && (
          <div className="mt-4">
            <Alert variant="warning">
              Your balance is negative. Purchasing is paused until it returns to
              0 or above. Sell a listing to earn credits back.
            </Alert>
          </div>
        )}
        <p className="mt-3 text-xs text-muted">
          You can spend down to {CREDIT_RULES.MIN_BALANCE} credits. The full
          wallet (transfers, history and QR payments) arrives in Milestone 3.
        </p>
      </section>

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
          href="/listings/mine"
          title="My listings"
          body={`${activeListings} active listing${activeListings === 1 ? "" : "s"}.`}
        />
        <QuickLink
          href="/favorites"
          title="Saved listings"
          body={`${savedCount} listing${savedCount === 1 ? "" : "s"} saved.`}
        />
        <QuickLink
          href="/browse"
          title="Browse marketplace"
          body="Find something to trade for."
        />
      </section>
    </div>
  );
}

function QuickLink({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-brand-300 hover:bg-brand-50"
    >
      <h3 className="font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </Link>
  );
}
