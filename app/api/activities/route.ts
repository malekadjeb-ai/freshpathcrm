import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { activities, customers, leads } from "@/src/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { z } from "zod";

const createActivitySchema = z.object({
  customerId: z.string().optional(),
  leadId: z.string().optional(),
  type: z.enum(["CALL", "TEXT", "EMAIL", "IN_PERSON", "NOTE"]),
  direction: z.enum(["INBOUND", "OUTBOUND"]).nullable().optional(),
  summary: z.string().min(1, "Summary is required"),
  followUpDate: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");
    const leadId = searchParams.get("leadId");

    if (!customerId && !leadId) {
      return NextResponse.json({ error: "customerId or leadId is required" }, { status: 400 });
    }

    // Verify customer/lead belongs to tenant
    if (customerId) {
      const [c] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId))).limit(1);
      if (!c) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    if (leadId) {
      const [l] = await db.select({ id: leads.id }).from(leads).where(and(eq(leads.id, leadId), eq(leads.tenantId, tenantId))).limit(1);
      if (!l) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const conditions = [];
    if (customerId) conditions.push(eq(activities.customerId, customerId));
    if (leadId) conditions.push(eq(activities.leadId, leadId));

    const allActivities = await db
      .select()
      .from(activities)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(activities.createdAt));

    // Batch: fetch all related customers and leads
    const customerIds = [...new Set(allActivities.filter(a => a.customerId).map(a => a.customerId!))];
    const leadIds = [...new Set(allActivities.filter(a => a.leadId).map(a => a.leadId!))];

    const [customerBatch, leadBatch] = await Promise.all([
      customerIds.length ? db.select({ id: customers.id, name: customers.name }).from(customers).where(inArray(customers.id, customerIds)) : Promise.resolve([]),
      leadIds.length ? db.select({ id: leads.id, name: leads.name }).from(leads).where(inArray(leads.id, leadIds)) : Promise.resolve([]),
    ]);

    const customerMap = new Map(customerBatch.map(c => [c.id, c]));
    const leadMap = new Map(leadBatch.map(l => [l.id, l]));

    const enriched = allActivities.map((activity) => ({
      ...activity,
      customer: activity.customerId ? customerMap.get(activity.customerId) ?? null : null,
      lead: activity.leadId ? leadMap.get(activity.leadId) ?? null : null,
    }));

    return NextResponse.json(enriched);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const body = await req.json();
    const parsed = createActivitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { customerId, leadId, type, direction, summary, followUpDate } = parsed.data;

    if (!customerId && !leadId) {
      return NextResponse.json({ error: "customerId or leadId is required" }, { status: 400 });
    }

    // Verify customer/lead belongs to tenant
    if (customerId) {
      const [c] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId))).limit(1);
      if (!c) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    if (leadId) {
      const [l] = await db.select({ id: leads.id }).from(leads).where(and(eq(leads.id, leadId), eq(leads.tenantId, tenantId))).limit(1);
      if (!l) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const [activity] = await db.insert(activities).values({
      customerId: customerId || null,
      leadId: leadId || null,
      type,
      direction: type === "NOTE" ? null : (direction || null),
      summary,
      followUpDate: followUpDate ? new Date(followUpDate).toISOString() : null,
    }).returning();

    // Update customer lastContactedAt
    if (type !== "NOTE" && customerId) {
      await db.update(customers)
        .set({ lastContactedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
        .where(eq(customers.id, customerId))
        .catch(() => {});
    }

    // Fetch related data for response
    const [customer] = customerId
      ? await db.select({ id: customers.id, name: customers.name }).from(customers).where(eq(customers.id, customerId))
      : [null];
    const [lead] = leadId
      ? await db.select({ id: leads.id, name: leads.name }).from(leads).where(eq(leads.id, leadId))
      : [null];

    return NextResponse.json({ ...activity, customer, lead }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
