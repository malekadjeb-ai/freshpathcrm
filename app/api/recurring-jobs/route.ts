import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { recurringJobs, customers, vehicles } from "@/src/db/schema";
import { eq, asc, and, inArray } from "drizzle-orm";
import { recurringJobSchema } from "@/lib/validations/recurring-job";
import { computeNextRunDate } from "@/lib/services/recurring";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const active = searchParams.get("active");
    const customerId = searchParams.get("customerId");

    // Pre-fetch tenant customer IDs for scoping
    const tenantCustRows = await db.select({ id: customers.id }).from(customers).where(eq(customers.tenantId, tenantId));
    const tenantCustIds = tenantCustRows.map(c => c.id);

    const conditions = [];
    if (tenantCustIds.length > 0) conditions.push(inArray(recurringJobs.customerId, tenantCustIds));
    else return NextResponse.json([]);
    if (active !== null) conditions.push(eq(recurringJobs.isActive, active === "true"));
    if (customerId) conditions.push(eq(recurringJobs.customerId, customerId));

    const allRJs = await db
      .select()
      .from(recurringJobs)
      .where(and(...conditions))
      .orderBy(asc(recurringJobs.nextRunDate));

    // Batch: fetch all related customers and vehicles
    const rjCustomerIds = [...new Set(allRJs.map(rj => rj.customerId))];
    const rjVehicleIds = [...new Set(allRJs.filter(rj => rj.vehicleId).map(rj => rj.vehicleId!))];

    const [rjCustBatch, rjVehBatch] = await Promise.all([
      rjCustomerIds.length ? db.select({ id: customers.id, name: customers.name, phone: customers.phone, email: customers.email }).from(customers).where(inArray(customers.id, rjCustomerIds)) : Promise.resolve([]),
      rjVehicleIds.length ? db.select({ id: vehicles.id, make: vehicles.make, model: vehicles.model, year: vehicles.year }).from(vehicles).where(inArray(vehicles.id, rjVehicleIds)) : Promise.resolve([]),
    ]);

    const rjCustMap = new Map(rjCustBatch.map(c => [c.id, c]));
    const rjVehMap = new Map(rjVehBatch.map(v => [v.id, v]));

    const enriched = allRJs.map((rj) => ({
      ...rj,
      customer: rjCustMap.get(rj.customerId) ?? undefined,
      vehicle: rj.vehicleId ? rjVehMap.get(rj.vehicleId) ?? null : null,
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
    const parsed = recurringJobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    // Verify customer belongs to tenant
    const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, data.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const nextRunDate = data.nextRunDate
      ? new Date(data.nextRunDate)
      : computeNextRunDate(data.frequency, data.dayOfWeek ?? null, new Date());

    const [recurringJob] = await db.insert(recurringJobs).values({
      customerId: data.customerId,
      vehicleId: data.vehicleId || null,
      frequency: data.frequency,
      dayOfWeek: data.dayOfWeek ?? null,
      timeOfDay: data.timeOfDay || null,
      services: data.services,
      addOns: data.addOns || null,
      location: data.location || "Richmond",
      address: data.address || null,
      totalPrice: data.totalPrice ?? null,
      notes: data.notes || null,
      isActive: data.isActive ?? true,
      nextRunDate: nextRunDate instanceof Date ? nextRunDate.toISOString() : nextRunDate,
    }).returning();

    const [customer] = await db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(eq(customers.id, recurringJob.customerId));
    const [vehicle] = recurringJob.vehicleId
      ? await db
          .select({ id: vehicles.id, make: vehicles.make, model: vehicles.model, year: vehicles.year })
          .from(vehicles)
          .where(eq(vehicles.id, recurringJob.vehicleId))
      : [null];

    return NextResponse.json({ ...recurringJob, customer, vehicle }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
