import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Stripe webhook receiver.
 *
 * Verifies the signature, then on `checkout.session.completed` mints the
 * purchased credits via apply_credit_purchase() (idempotent on the Stripe
 * payment intent id, so retries are safe).
 */
export async function POST(request: NextRequest) {
  let webhookSecret: string | undefined;
  try {
    webhookSecret = getServerEnv().STRIPE_WEBHOOK_SECRET;
  } catch {
    return NextResponse.json(
      { error: "Server env is not configured." },
      { status: 500 },
    );
  }
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not set." },
      { status: 503 },
    );
  }

  const signature = (await headers()).get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Signature verification failed: ${message}` },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    await handleCheckoutCompleted(session);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return;

  const userId = session.metadata?.user_id;
  const credits = Number(session.metadata?.credits);
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  if (!userId || !credits || !paymentIntentId) {
    // Not enough metadata to fulfil. We still return 200 so Stripe doesn't
    // keep retrying; log if this ever shows up in practice.
    console.warn("[stripe webhook] missing metadata on session", session.id);
    return;
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("apply_credit_purchase", {
    p_user_id: userId,
    p_stripe_payment_intent_id: paymentIntentId,
    p_stripe_session_id: session.id,
    p_credits: credits,
    p_amount_usd_cents: session.amount_total ?? 0,
  });

  if (error) {
    console.error("[stripe webhook] apply_credit_purchase failed", error);
    // Throw so Stripe retries; the function is idempotent.
    throw new Error(error.message);
  }
}
