import Stripe from "stripe";

// Lazily constructed so the app doesn't crash at import time in
// environments (like this dev sandbox) that don't have Stripe keys set —
// the error only surfaces when a checkout is actually attempted.
let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}
