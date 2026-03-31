import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { tenants } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";

export async function POST() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { session, tenantId } = auth;

  const stripe = await getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 500 }
    );
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return NextResponse.json(
      { error: "Stripe price not configured" },
      { status: 500 }
    );
  }

  const db = getDb();
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId));

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  let customerId = tenant.billingCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user?.email ?? undefined,
      name: tenant.name,
      metadata: { tenantId },
    });
    customerId = customer.id;

    await db
      .update(tenants)
      .set({
        billingCustomerId: customerId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tenants.id, tenantId));
  }

  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/settings/billing?billing=success`,
    cancel_url: `${baseUrl}/settings/billing?billing=cancelled`,
    metadata: { tenantId },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
