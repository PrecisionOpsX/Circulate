import "server-only";
import Stripe from "stripe";
import { getServerEnv } from "@/lib/env";

let cached: Stripe | null = null;

/**
 * Server-only Stripe client, lazily constructed so the module loads even
 * when Stripe is not yet configured. Call sites should check
 * isStripeEnabled first (or be entirely behind a flag check) before
 * invoking this.
 */
export function getStripe(): Stripe {
  if (cached) return cached;
  const { STRIPE_SECRET_KEY } = getServerEnv();
  if (!STRIPE_SECRET_KEY) {
    throw new Error(
      "Stripe is not configured. Add STRIPE_SECRET_KEY to your environment.",
    );
  }
  cached = new Stripe(STRIPE_SECRET_KEY, {
    typescript: true,
    appInfo: { name: "Circulate", version: "0.1.0" },
  });
  return cached;
}
