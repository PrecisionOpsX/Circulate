import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { fulfilSessionAction } from "@/app/credits/actions";
import { formatCredits } from "@/lib/utils";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Credits added" };

type SearchParams = Promise<{ session_id?: string }>;

export default async function BuyCreditsSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireUser("/credits/buy");
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) {
    return (
      <Shell>
        <Alert variant="warning">
          Missing checkout reference. If you completed a payment, head to your
          dashboard. Credits arrive automatically.
        </Alert>
        <Buttons />
      </Shell>
    );
  }

  // Belt-and-braces fulfilment: the webhook usually wins, but if the user
  // returns from Stripe before the webhook fires, this catches it.
  const result = await fulfilSessionAction(sessionId);

  if (result.pending) {
    return (
      <Shell>
        <Alert variant="info">
          Stripe is still processing your payment. Refresh in a moment, or
          check your dashboard. Credits arrive automatically.
        </Alert>
        <Buttons />
      </Shell>
    );
  }

  if (!result.ok) {
    return (
      <Shell>
        <Alert variant="error">
          {result.error ?? "Something went wrong fulfilling your purchase."}
        </Alert>
        <Buttons />
      </Shell>
    );
  }

  const dollars = ((result.amountUsdCents ?? 0) / 100).toFixed(2);
  return (
    <Shell>
      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-circ-green">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-brand-900">
          Credits added!
        </h1>
        <p className="mt-2 text-sm text-muted">
          You purchased{" "}
          <span className="font-semibold text-foreground">
            {formatCredits(result.credits ?? 0)} credits
          </span>{" "}
          for ${dollars} USD.
        </p>
      </div>
      <Buttons />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md flex-1 px-4 py-12">{children}</div>
  );
}

function Buttons() {
  return (
    <div className="mt-6 flex flex-col gap-2">
      <Button asChild>
        <Link href="/dashboard">Go to dashboard</Link>
      </Button>
      <Button asChild variant="secondary">
        <Link href="/browse">Start spending</Link>
      </Button>
    </div>
  );
}
