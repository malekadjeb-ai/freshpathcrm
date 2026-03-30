import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { quotes, customers, jobs } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const body = await req.json();
    const selectedTier = body.selectedTier as string; // "good", "better", "best"

    const [quote] = await db.select().from(quotes).where(eq(quotes.id, params.id));
    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    if (!quote.customerId) return NextResponse.json({ error: "Quote must have a customer to accept" }, { status: 400 });

    // Verify customer belongs to tenant
    const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, quote.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Fetch customer
    const customer = await db
      .select()
      .from(customers)
      .where(eq(customers.id, quote.customerId))
      .then((r) => r[0] ?? null);

    // Determine price based on selected tier
    let total = quote.total;
    if (selectedTier === "good") total = quote.goodPrice;
    else if (selectedTier === "better") total = quote.betterPrice;
    else if (selectedTier === "best") total = quote.bestPrice;

    // Create job from accepted quote
    const [job] = await db
      .insert(jobs)
      .values({
        customerId: quote.customerId,
        vehicleId: quote.vehicleId || null,
        status: "Scheduled",
        subtotal: total,
        total,
        notes: `Created from ${quote.quoteNumber} (${selectedTier || "custom"} tier)`,
        address: customer?.address || "",
        city: customer?.city || "Richmond",
        location: customer?.city || "Richmond",
      })
      .returning();

    // Update quote
    await db
      .update(quotes)
      .set({
        status: "Accepted",
        selectedTier: selectedTier || null,
        respondedAt: new Date().toISOString(),
        convertedToJobId: job.id,
        total,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(quotes.id, params.id));

    return NextResponse.json({ quote: { ...quote, status: "Accepted" }, job });
  } catch {
    return NextResponse.json({ error: "Failed to accept quote" }, { status: 500 });
  }
}
