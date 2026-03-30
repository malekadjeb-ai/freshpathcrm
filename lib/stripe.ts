import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export async function getStripe(): Promise<Stripe | null> {
  if (stripeInstance) return stripeInstance;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;

  stripeInstance = new Stripe(secretKey, {
    apiVersion: "2026-02-25.clover",
  });
  return stripeInstance;
}

export async function getStripeWebhookSecret(): Promise<string | null> {
  return process.env.STRIPE_WEBHOOK_SECRET || null;
}
