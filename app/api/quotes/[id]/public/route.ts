import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/src/db";
import { quotes, customers, leads } from "@/src/db/schema";
import { eq } from "drizzle-orm";

// Public route — no auth required
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();

    const [quote] = await db.select().from(quotes).where(eq(quotes.id, params.id));
    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

    const customer = quote.customerId
      ? await db
          .select({ name: customers.name })
          .from(customers)
          .where(eq(customers.id, quote.customerId))
          .then((r) => r[0] ?? null)
      : null;

    const lead = quote.leadId
      ? await db
          .select({ name: leads.name })
          .from(leads)
          .where(eq(leads.id, quote.leadId))
          .then((r) => r[0] ?? null)
      : null;

    // Track view
    if (!quote.viewedAt) {
      await db
        .update(quotes)
        .set({
          viewedAt: new Date().toISOString(),
          status: quote.status === "Sent" ? "Viewed" : quote.status,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(quotes.id, params.id));
    }

    // Return safe subset (no internal IDs)
    return NextResponse.json({
      quoteNumber: quote.quoteNumber,
      customerName: customer?.name || lead?.name || "Customer",
      status: quote.status,
      goodName: quote.goodName,
      goodPrice: quote.goodPrice,
      goodItems: quote.goodItems,
      betterName: quote.betterName,
      betterPrice: quote.betterPrice,
      betterItems: quote.betterItems,
      bestName: quote.bestName,
      bestPrice: quote.bestPrice,
      bestItems: quote.bestItems,
      addOns: quote.addOns,
      discount: quote.discount,
      notes: quote.notes,
      expiresAt: quote.expiresAt,
      selectedTier: quote.selectedTier,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
