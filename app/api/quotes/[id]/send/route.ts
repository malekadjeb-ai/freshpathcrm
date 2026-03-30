import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { quotes, customers, leads, communications } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();

    const [existing] = await db.select().from(quotes).where(eq(quotes.id, params.id));
    if (!existing) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

    // Verify tenant ownership
    if (existing.customerId) {
      const [c] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, existing.customerId), eq(customers.tenantId, tenantId))).limit(1);
      if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (existing.leadId) {
      const [l] = await db.select({ id: leads.id }).from(leads).where(and(eq(leads.id, existing.leadId), eq(leads.tenantId, tenantId))).limit(1);
      if (!l) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [quote] = await db
      .update(quotes)
      .set({
        status: "Sent",
        sentAt: new Date().toISOString(),
        expiresAt:
          existing.expiresAt ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(quotes.id, params.id))
      .returning();

    // Fetch customer and lead for response
    const customer = quote.customerId
      ? await db
          .select({ name: customers.name, phone: customers.phone, email: customers.email })
          .from(customers)
          .where(eq(customers.id, quote.customerId))
          .then((r) => r[0] ?? null)
      : null;

    const lead = quote.leadId
      ? await db
          .select({ name: leads.name, phone: leads.phone, email: leads.email })
          .from(leads)
          .where(eq(leads.id, quote.leadId))
          .then((r) => r[0] ?? null)
      : null;

    if (quote.customerId) {
      await db.insert(communications).values({
        customerId: quote.customerId,
        type: "sms",
        direction: "outbound",
        status: "sent",
        summary: `Quote ${quote.quoteNumber} sent`,
        body: `Your quote from Fresh Path Mobile Detailing is ready to view.`,
      });
    }

    return NextResponse.json({ ...quote, customer, lead });
  } catch {
    return NextResponse.json({ error: "Failed to send quote" }, { status: 500 });
  }
}
