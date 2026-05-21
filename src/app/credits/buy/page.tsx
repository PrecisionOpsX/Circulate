import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { isStripeEnabled } from "@/lib/env";
import { CREDIT_PACKAGES } from "@/lib/constants";
import {
  getPlatformSettings,
  getRecentCreditPurchaseTotal,
} from "@/lib/platform-settings";
import { formatCredits } from "@/lib/utils";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { startCheckoutAction } from "@/app/credits/actions";
import { CustomCreditCard } from "./CustomCreditCard";

export const metadata: Metadata = { title: "Buy credits" };

type SearchParams = Promise<{ cancelled?: string; error?: string }>;

export default async function BuyCreditsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser("/credits/buy");
  const { cancelled, error } = await searchParams;

  const { monthlyCreditPurchaseCap } = await getPlatformSettings();
  const alreadyBought = await getRecentCreditPurchaseTotal(user.id);
  const remainingCap = Math.max(0, monthlyCreditPurchaseCap - alreadyBought);
  const capReached = remainingCap <= 0;

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-brand-900">
          Buy credits
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Top up your wallet so you can keep trading even before you have
          sold anything.
        </p>
      </header>

      {cancelled && (
        <div className="mx-auto mt-6 max-w-md">
          <Alert variant="warning">Checkout was cancelled. No charges made.</Alert>
        </div>
      )}
      {error === "disabled" && (
        <div className="mx-auto mt-6 max-w-md">
          <Alert variant="warning">
            Buying credits is not enabled yet. Please try again later.
          </Alert>
        </div>
      )}
      {error === "session" && (
        <div className="mx-auto mt-6 max-w-md">
          <Alert variant="error">
            Could not start checkout. Try again or contact support.
          </Alert>
        </div>
      )}
      {error === "cap" && (
        <div className="mx-auto mt-6 max-w-md">
          <Alert variant="error">
            That purchase would exceed your monthly limit of{" "}
            {formatCredits(monthlyCreditPurchaseCap)} credits. Try a smaller
            amount or wait for older purchases to roll off the 30-day window.
          </Alert>
        </div>
      )}

      {/* Monthly cap status (always shown so users understand the limit). */}
      {isStripeEnabled && (
        <div className="mx-auto mt-6 max-w-md rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted">This month&apos;s purchase limit</span>
            <span className="font-semibold text-brand-900">
              {formatCredits(remainingCap)} of{" "}
              {formatCredits(monthlyCreditPurchaseCap)} left
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-100">
            <div
              className="h-full bg-[linear-gradient(90deg,var(--color-circ-green),var(--color-circ-blue))]"
              style={{
                width: `${Math.max(
                  0,
                  Math.min(
                    100,
                    (alreadyBought / Math.max(1, monthlyCreditPurchaseCap)) *
                      100,
                  ),
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      {!isStripeEnabled ? (
        <div className="mx-auto mt-10 max-w-md rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
          <h2 className="text-base font-semibold text-brand-900">
            Credit purchases are not turned on yet
          </h2>
          <p className="mt-2 text-sm text-muted">
            Stripe needs to be configured before this works. Once the team
            has set it up, your options will appear here.
          </p>
          <Button asChild className="mt-5" variant="secondary">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {CREDIT_PACKAGES.map((pkg) => {
              const popular = "popular" in pkg && pkg.popular;
              const dollars = (pkg.amountUsdCents / 100).toFixed(2);
              const perCredit = (
                pkg.amountUsdCents /
                pkg.credits /
                100
              ).toFixed(3);
              const wouldExceed = pkg.credits > remainingCap;
              return (
                <form
                  key={pkg.id}
                  action={startCheckoutAction}
                  className={`relative flex flex-col rounded-2xl border bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] ${
                    popular
                      ? "border-circ-blue ring-2 ring-circ-blue/20"
                      : "border-border"
                  }`}
                >
                  {popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge variant="blue">Most popular</Badge>
                    </span>
                  )}
                  <p className="text-sm font-semibold text-circ-blue">
                    {pkg.label}
                  </p>
                  <p className="mt-3 text-4xl font-extrabold text-brand-900">
                    {pkg.credits}
                    <span className="ml-1 text-base font-semibold text-muted">
                      credits
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    ${dollars} USD (${perCredit} per credit)
                  </p>
                  <p className="mt-3 text-sm text-foreground">{pkg.blurb}</p>

                  <input type="hidden" name="packageId" value={pkg.id} />
                  <Button
                    type="submit"
                    variant={popular ? "gradient" : "primary"}
                    className="mt-6 w-full"
                    disabled={wouldExceed}
                  >
                    {wouldExceed
                      ? "Over monthly limit"
                      : `Buy ${pkg.credits} credits`}
                  </Button>
                </form>
              );
            })}
          </div>

          {/* Custom amount */}
          <div className="mt-12">
            <div className="mb-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium uppercase tracking-wider text-muted">
                Or pick your own amount
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="mx-auto max-w-sm">
              <CustomCreditCard remainingCap={remainingCap} />
            </div>
          </div>

          {capReached && (
            <div className="mx-auto mt-10 max-w-md">
              <Alert variant="warning">
                You&apos;ve reached this month&apos;s purchase limit of{" "}
                {formatCredits(monthlyCreditPurchaseCap)} credits. The limit
                rolls forward 30 days from each purchase.
              </Alert>
            </div>
          )}
        </>
      )}

      <p className="mx-auto mt-10 max-w-md text-center text-xs text-muted">
        Secure checkout by Stripe. Credits are added to your wallet
        automatically once payment clears. Credits have no cash value and
        cannot be refunded once spent.
      </p>
    </div>
  );
}
