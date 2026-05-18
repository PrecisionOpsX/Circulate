"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { clientEnv, isStripeEnabled } from "@/lib/env";
import { CREDIT_PACKAGES, type CreditPackageId } from "@/lib/constants";

/**
 * Create a Stripe Checkout Session for one of the credit packages and
 * redirect the user to Stripe's hosted checkout page.
 *
 * Called from a `<form action={startCheckoutAction}>` on the buy-credits
 * page, with the package id passed as a hidden input.
 */
export async function startCheckoutAction(formData: FormData): Promise<void> {
  if (!isStripeEnabled) {
    redirect("/credits/buy?error=disabled");
  }

  const packageId = String(formData.get("packageId") ?? "") as CreditPackageId;
  const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
  if (!pkg) {
    redirect("/credits/buy?error=invalid");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/credits/buy");
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email ?? undefined,
    client_reference_id: user.id,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${pkg.credits} Circulate credits`,
            description: pkg.label,
          },
          unit_amount: pkg.amountUsdCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      user_id: user.id,
      credits: String(pkg.credits),
      package_id: pkg.id,
    },
    payment_intent_data: {
      // Mirror the metadata on the PaymentIntent so we still have it
      // available in webhooks that key off the PI directly.
      metadata: {
        user_id: user.id,
        credits: String(pkg.credits),
        package_id: pkg.id,
      },
    },
    success_url: `${clientEnv.NEXT_PUBLIC_SITE_URL}/credits/buy/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${clientEnv.NEXT_PUBLIC_SITE_URL}/credits/buy?cancelled=1`,
  });

  if (!session.url) {
    redirect("/credits/buy?error=session");
  }
  redirect(session.url);
}

/**
 * Verify a completed Stripe Checkout session and mint the purchased credits.
 *
 * Called from the success page as a safety net in case the webhook hasn't
 * fired yet. Idempotent: the apply_credit_purchase SQL function de-dupes
 * on the Stripe payment intent id.
 */
export type FulfilResult = {
  ok: boolean;
  credits?: number;
  amountUsdCents?: number;
  pending?: boolean;
  error?: string;
};

export async function fulfilSessionAction(
  sessionId: string,
): Promise<FulfilResult> {
  if (!isStripeEnabled) return { ok: false, error: "Stripe is not configured." };
  if (!sessionId.startsWith("cs_")) {
    return { ok: false, error: "Invalid session id." };
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") {
    return { ok: false, pending: true };
  }

  const userId = session.metadata?.user_id;
  const credits = Number(session.metadata?.credits);
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  if (!userId || !credits || !paymentIntentId) {
    return { ok: false, error: "Session metadata is incomplete." };
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("apply_credit_purchase", {
    p_user_id: userId,
    p_stripe_payment_intent_id: paymentIntentId,
    p_stripe_session_id: session.id,
    p_credits: credits,
    p_amount_usd_cents: session.amount_total ?? 0,
  });
  if (error) return { ok: false, error: error.message };

  // No revalidatePath here: the success page invokes this during render,
  // and Next.js 16 only allows revalidation from actions or route handlers.
  // The pages we'd revalidate (/dashboard, /transactions, /credits/buy) are
  // dynamic server components that refetch on every request anyway, so
  // navigating to them already shows the new balance.
  return {
    ok: true,
    credits,
    amountUsdCents: session.amount_total ?? 0,
  };
}
