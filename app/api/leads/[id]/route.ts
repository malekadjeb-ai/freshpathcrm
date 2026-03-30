import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { leads, customers, estimates, estimateItems, serviceItems, activities } from "@/src/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { leadSchema } from "@/lib/validations/lead";
import { triggerWorkflows } from "@/lib/services/workflow-engine";

export async function GET(
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

    // Fetch customer separately
    const customer = lead.customerId
      ? await db
          .select({ id: customers.id, name: customers.name })
          .from(customers)
          .where(eq(customers.id, lead.customerId))
          .then((r) => r[0] ?? null)
      : null;

    // Fetch estimates with line items
    const leadEstimates = await db
      .select()
      .from(estimates)
      .where(eq(estimates.customerId, lead.customerId ?? ""))
      .orderBy(desc(estimates.createdAt));

    // Batch: fetch all estimate items for all estimates at once
    const leadEstimateIds = leadEstimates.map(e => e.id);
    const allLeadEstItems = leadEstimateIds.length
      ? await db.select({
          id: estimateItems.id,
          estimateId: estimateItems.estimateId,
          serviceId: estimateItems.serviceId,
          name: estimateItems.name,
          description: estimateItems.description,
          price: estimateItems.price,
          quantity: estimateItems.quantity,
          createdAt: estimateItems.createdAt,
          service: {
            id: serviceItems.id,
            name: serviceItems.name,
            description: serviceItems.description,
            basePrice: serviceItems.basePrice,
            category: serviceItems.category,
          },
        }).from(estimateItems)
          .leftJoin(serviceItems, eq(estimateItems.serviceId, serviceItems.id))
          .where(inArray(estimateItems.estimateId, leadEstimateIds))
      : [];

    const leadEstItemsMap = new Map<string, (typeof allLeadEstItems)[number][]>();
    for (const li of allLeadEstItems) {
      if (!leadEstItemsMap.has(li.estimateId)) leadEstItemsMap.set(li.estimateId, []);
      leadEstItemsMap.get(li.estimateId)!.push(li);
    }

    const estimatesWithItems = leadEstimates.map((est) => ({
      ...est,
      lineItems: leadEstItemsMap.get(est.id) || [],
    }));

    // Fetch activities
    const leadActivities = await db
      .select()
      .from(activities)
      .where(eq(activities.leadId, params.id))
      .orderBy(desc(activities.createdAt));

    return NextResponse.json({
      ...lead,
      customer,
      estimates: estimatesWithItems,
      activities: leadActivities,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { tenantId } = auth;

    const db = getDb();

    // Verify tenant ownership
    const [existing] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, params.id), eq(leads.tenantId, tenantId)));
    if (!existing)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const parsed = leadSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Handle status transitions
    const updateData: Record<string, unknown> = { ...data, updatedAt: new Date().toISOString() };
    if (data.status === "Contacted" && !body.contactedAt) {
      updateData.contactedAt = new Date().toISOString();
    }
    if (data.status === "Lost") {
      updateData.lostAt = new Date().toISOString();
    }
    if (data.status === "Booked") {
      updateData.convertedAt = new Date().toISOString();
    }

    const [lead] = await db
      .update(leads)
      .set(updateData)
      .where(eq(leads.id, params.id))
      .returning();

    if (data.status) {
      triggerWorkflows("lead.status_changed", {
        leadId: lead.id,
        customerName: lead.name,
        newStatus: data.status,
        phone: lead.phone,
        email: lead.email,
      });
    }

    return NextResponse.json(lead);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session, tenantId } = auth;

    // Only ADMIN/OWNER can delete leads
    const role = session.user.role;
    if (role !== "ADMIN" && role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getDb();

    // Verify tenant ownership
    const [existing] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, params.id), eq(leads.tenantId, tenantId)));
    if (!existing)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.delete(leads).where(eq(leads.id, params.id));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
