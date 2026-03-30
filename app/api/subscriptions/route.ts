import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { subscriptions, customers, servicePlans, vehicles } from "@/src/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { addMonths, addWeeks } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const customerId = searchParams.get("customerId");

    // Pre-fetch tenant customer IDs for scoping
    const tenantCustRows = await db.select({ id: customers.id }).from(customers).where(eq(customers.tenantId, tenantId));
    const tenantCustIds = tenantCustRows.map(c => c.id);

    const conditions = [];
    if (tenantCustIds.length > 0) conditions.push(inArray(subscriptions.customerId, tenantCustIds));
    else return NextResponse.json([]);
    if (status) conditions.push(eq(subscriptions.status, status));
    if (customerId) conditions.push(eq(subscriptions.customerId, customerId));

    const allSubs = await db
      .select()
      .from(subscriptions)
      .where(and(...conditions))
      .orderBy(desc(subscriptions.createdAt));

    // Batch: fetch all related customers, plans, and vehicles
    const subCustIds = [...new Set(allSubs.map(s => s.customerId))];
    const subPlanIds = [...new Set(allSubs.map(s => s.planId))];
    const subVehIds = [...new Set(allSubs.filter(s => s.vehicleId).map(s => s.vehicleId!))];

    const [subCustBatch, subPlanBatch, subVehBatch] = await Promise.all([
      subCustIds.length ? db.select({ id: customers.id, name: customers.name, phone: customers.phone, email: customers.email }).from(customers).where(inArray(customers.id, subCustIds)) : Promise.resolve([]),
      subPlanIds.length ? db.select().from(servicePlans).where(inArray(servicePlans.id, subPlanIds)) : Promise.resolve([]),
      subVehIds.length ? db.select().from(vehicles).where(inArray(vehicles.id, subVehIds)) : Promise.resolve([]),
    ]);

    const subCustMap = new Map(subCustBatch.map(c => [c.id, c]));
    const subPlanMap = new Map(subPlanBatch.map(p => [p.id, p]));
    const subVehMap = new Map(subVehBatch.map(v => [v.id, v]));

    const enriched = allSubs.map((sub) => ({
      ...sub,
      customer: subCustMap.get(sub.customerId) ?? undefined,
      plan: subPlanMap.get(sub.planId) ?? undefined,
      vehicle: sub.vehicleId ? subVehMap.get(sub.vehicleId) ?? null : null,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Subscriptions error:", error);
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const body = await req.json();
    const { customerId, planId, vehicleId, startDate } = body;

    if (!customerId || !planId) {
      return NextResponse.json({ error: "customerId and planId required" }, { status: 400 });
    }

    // Verify customer belongs to tenant
    const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const [plan] = await db.select().from(servicePlans).where(eq(servicePlans.id, planId));
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const start = startDate ? new Date(startDate) : new Date();
    const nextBilling = plan.frequency === "weekly"
      ? addWeeks(start, 1)
      : plan.frequency === "biweekly"
      ? addWeeks(start, 2)
      : addMonths(start, 1);

    const [subscription] = await db.insert(subscriptions).values({
      customerId,
      planId,
      vehicleId: vehicleId || null,
      startDate: start.toISOString(),
      nextBillingDate: nextBilling.toISOString(),
      nextServiceDate: start.toISOString(),
      status: "active",
    }).returning();

    const [customer] = await db
      .select({ name: customers.name })
      .from(customers)
      .where(eq(customers.id, customerId));

    return NextResponse.json({ ...subscription, customer, plan });
  } catch (error) {
    console.error("Create subscription error:", error);
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }
}
