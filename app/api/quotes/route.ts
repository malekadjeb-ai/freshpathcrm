import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { quotes, customers, leads } from "@/src/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "25");

    // Build conditions
    const conditions = [];
    if (status) conditions.push(eq(quotes.status, status));

    const baseWhere = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch quotes with customer and lead joins
    const rows = await db
      .select({
        id: quotes.id,
        quoteNumber: quotes.quoteNumber,
        customerId: quotes.customerId,
        leadId: quotes.leadId,
        vehicleId: quotes.vehicleId,
        status: quotes.status,
        goodName: quotes.goodName,
        goodPrice: quotes.goodPrice,
        goodItems: quotes.goodItems,
        betterName: quotes.betterName,
        betterPrice: quotes.betterPrice,
        betterItems: quotes.betterItems,
        bestName: quotes.bestName,
        bestPrice: quotes.bestPrice,
        bestItems: quotes.bestItems,
        selectedTier: quotes.selectedTier,
        addOns: quotes.addOns,
        subtotal: quotes.subtotal,
        discount: quotes.discount,
        tax: quotes.tax,
        total: quotes.total,
        sentAt: quotes.sentAt,
        viewedAt: quotes.viewedAt,
        respondedAt: quotes.respondedAt,
        expiresAt: quotes.expiresAt,
        notes: quotes.notes,
        convertedToJobId: quotes.convertedToJobId,
        createdAt: quotes.createdAt,
        updatedAt: quotes.updatedAt,
        customer: {
          id: customers.id,
          name: customers.name,
          phone: customers.phone,
        },
        lead: {
          id: leads.id,
          name: leads.name,
          phone: leads.phone,
        },
      })
      .from(quotes)
      .leftJoin(customers, eq(quotes.customerId, customers.id))
      .leftJoin(leads, eq(quotes.leadId, leads.id))
      .where(baseWhere)
      .orderBy(desc(quotes.createdAt));

    // Filter by search in JS
    const filtered = search
      ? rows.filter(
          (r) =>
            r.quoteNumber.toLowerCase().includes(search.toLowerCase()) ||
            (r.customer?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
            (r.lead?.name ?? "").toLowerCase().includes(search.toLowerCase())
        )
      : rows;

    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    return NextResponse.json({ data: paginated, meta: { total, page, limit } });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    const db = getDb();
    const body = await req.json();

    // Auto-generate quote number
    const lastQuote = await db
      .select({ quoteNumber: quotes.quoteNumber })
      .from(quotes)
      .orderBy(desc(quotes.createdAt))
      .limit(1)
      .then((r) => r[0] ?? null);

    let nextNum = 1;
    if (lastQuote) {
      const match = lastQuote.quoteNumber.match(/(\d+)$/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const quoteNumber = `QT-${new Date().getFullYear()}-${String(nextNum).padStart(3, "0")}`;

    const [quote] = await db
      .insert(quotes)
      .values({
        quoteNumber,
        customerId: body.customerId || null,
        leadId: body.leadId || null,
        vehicleId: body.vehicleId || null,
        status: body.status || "Draft",
        goodName: body.goodName || "Essential Detail",
        goodPrice: body.goodPrice || 0,
        goodItems: typeof body.goodItems === "string" ? body.goodItems : JSON.stringify(body.goodItems || []),
        betterName: body.betterName || "Premium Detail",
        betterPrice: body.betterPrice || 0,
        betterItems: typeof body.betterItems === "string" ? body.betterItems : JSON.stringify(body.betterItems || []),
        bestName: body.bestName || "Ultimate Detail",
        bestPrice: body.bestPrice || 0,
        bestItems: typeof body.bestItems === "string" ? body.bestItems : JSON.stringify(body.bestItems || []),
        addOns: typeof body.addOns === "string" ? body.addOns : JSON.stringify(body.addOns || []),
        subtotal: body.subtotal || 0,
        discount: body.discount || 0,
        tax: body.tax || 0,
        total: body.total || 0,
        notes: body.notes || null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt).toISOString() : null,
      })
      .returning();

    // Fetch customer and lead for response
    const customer = quote.customerId
      ? await db
          .select({ id: customers.id, name: customers.name })
          .from(customers)
          .where(eq(customers.id, quote.customerId))
          .then((r) => r[0] ?? null)
      : null;

    const lead = quote.leadId
      ? await db
          .select({ id: leads.id, name: leads.name })
          .from(leads)
          .where(eq(leads.id, quote.leadId))
          .then((r) => r[0] ?? null)
      : null;

    return NextResponse.json({ ...quote, customer, lead }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create quote" }, { status: 500 });
  }
}
