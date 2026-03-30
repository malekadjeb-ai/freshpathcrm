import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getDb } from "@/src/db";
import { quotes, customers, jobs } from "@/src/db/schema";
import { eq } from "drizzle-orm";

// Public route — no auth required (customer accepts from public quote page)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const { success } = rateLimit(`quote-accept:${ip}`, 10, 60_000);
    if (!success) return rateLimitResponse();

    const body = await req.json();
    const selectedTier = body.selectedTier as string;

    if (!selectedTier || !["good", "better", "best"].includes(selectedTier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    const db = getDb();

    const [quote] = await db.select().from(quotes).where(eq(quotes.id, params.id));
    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    if (quote.status === "Accepted") return NextResponse.json({ error: "Quote already accepted" }, { status: 400 });
    if (quote.status === "Declined" || quote.status === "Expired") {
      return NextResponse.json({ error: `Quote is ${quote.status.toLowerCase()}` }, { status: 400 });
    }
    if (!quote.customerId) return NextResponse.json({ error: "Quote missing customer" }, { status: 400 });

    // Fetch customer
    const customer = await db
      .select()
      .from(customers)
      .where(eq(customers.id, quote.customerId))
      .then((r) => r[0] ?? null);

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
        notes: `Created from ${quote.quoteNumber} (${selectedTier} tier) — accepted by customer`,
        address: customer?.address || "",
        city: customer?.city || "Richmond",
        location: customer?.city || "Richmond",
      })
      .returning();

    await db
      .update(quotes)
      .set({
        status: "Accepted",
        selectedTier,
        respondedAt: new Date().toISOString(),
        convertedToJobId: job.id,
        total,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(quotes.id, params.id));

    return NextResponse.json({ success: true, selectedTier });
  } catch {
    return NextResponse.json({ error: "Failed to accept quote" }, { status: 500 });
  }
}
