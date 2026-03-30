import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { quotes, customers, leads } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();

    const [quote] = await db.select().from(quotes).where(eq(quotes.id, params.id));
    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

    // Verify tenant ownership via customer or lead
    if (quote.customerId) {
      const [c] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, quote.customerId), eq(customers.tenantId, tenantId))).limit(1);
      if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (quote.leadId) {
      const [l] = await db.select({ id: leads.id }).from(leads).where(and(eq(leads.id, quote.leadId), eq(leads.tenantId, tenantId))).limit(1);
      if (!l) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const customer = quote.customerId
      ? await db
          .select({ id: customers.id, name: customers.name, phone: customers.phone, email: customers.email })
          .from(customers)
          .where(eq(customers.id, quote.customerId))
          .then((r) => r[0] ?? null)
      : null;

    const lead = quote.leadId
      ? await db
          .select({ id: leads.id, name: leads.name, phone: leads.phone, email: leads.email })
          .from(leads)
          .where(eq(leads.id, quote.leadId))
          .then((r) => r[0] ?? null)
      : null;

    return NextResponse.json({ ...quote, customer, lead });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();

    // Verify quote belongs to tenant
    const [existing] = await db.select().from(quotes).where(eq(quotes.id, params.id));
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.customerId) {
      const [c] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, existing.customerId), eq(customers.tenantId, tenantId))).limit(1);
      if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (existing.leadId) {
      const [l] = await db.select({ id: leads.id }).from(leads).where(and(eq(leads.id, existing.leadId), eq(leads.tenantId, tenantId))).limit(1);
      if (!l) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const data: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    const fields = ["status", "goodName", "goodPrice", "betterName", "betterPrice", "bestName", "bestPrice", "selectedTier", "subtotal", "discount", "tax", "total", "notes"];
    for (const f of fields) {
      if (body[f] !== undefined) data[f] = body[f];
    }

    // JSON fields
    for (const f of ["goodItems", "betterItems", "bestItems", "addOns"]) {
      if (body[f] !== undefined) {
        data[f] = typeof body[f] === "string" ? body[f] : JSON.stringify(body[f]);
      }
    }

    if (body.expiresAt) data.expiresAt = new Date(body.expiresAt).toISOString();

    const [quote] = await db
      .update(quotes)
      .set(data)
      .where(eq(quotes.id, params.id))
      .returning();

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

    return NextResponse.json({ ...quote, customer, lead });
  } catch {
    return NextResponse.json({ error: "Failed to update quote" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();

    // Verify quote belongs to tenant
    const [existing] = await db.select().from(quotes).where(eq(quotes.id, params.id));
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.customerId) {
      const [c] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, existing.customerId), eq(customers.tenantId, tenantId))).limit(1);
      if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (existing.leadId) {
      const [l] = await db.select({ id: leads.id }).from(leads).where(and(eq(leads.id, existing.leadId), eq(leads.tenantId, tenantId))).limit(1);
      if (!l) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.delete(quotes).where(eq(quotes.id, params.id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete quote" }, { status: 500 });
  }
}
