import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { leads, customers } from "@/src/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { fireWebhooks } from "@/lib/webhooks";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { tenantId } = auth;

    const db = getDb();

    const [lead] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, params.id), eq(leads.tenantId, tenantId)));

    if (!lead)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (lead.status === "Lost")
      return NextResponse.json({ error: "Cannot convert a lost lead" }, { status: 400 });

    if (lead.customerId)
      return NextResponse.json({ error: "Lead already converted" }, { status: 400 });

    // Check for existing customer by phone or email
    let customer = null;
    if (lead.phone) {
      const results = await db
        .select()
        .from(customers)
        .where(and(eq(customers.phone, lead.phone), isNull(customers.deletedAt)));
      customer = results[0] ?? null;
    }
    if (!customer && lead.email) {
      const results = await db
        .select()
        .from(customers)
        .where(and(eq(customers.email, lead.email), isNull(customers.deletedAt)));
      customer = results[0] ?? null;
    }

    // Create customer if not found
    if (!customer) {
      const [created] = await db
        .insert(customers)
        .values({
          name: lead.name,
          phone: lead.phone ?? undefined,
          email: lead.email ?? undefined,
          address: lead.address ?? undefined,
          city: lead.city ?? undefined,
          source: lead.source,
          sourceDetail: lead.sourceDetail ?? undefined,
          lifecycleStage: "new",
          tenantId,
        })
        .returning();
      customer = created;
    }

    // Update lead
    await db
      .update(leads)
      .set({
        status: "Booked",
        customerId: customer.id,
        convertedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(leads.id, params.id));

    fireWebhooks("lead.converted", {
      leadId: params.id,
      leadName: lead.name,
      customerId: customer.id,
      customerName: customer.name,
    });

    return NextResponse.json(customer, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
