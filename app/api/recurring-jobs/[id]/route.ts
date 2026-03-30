import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { recurringJobs, customers, vehicles } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const [rj] = await db.select().from(recurringJobs).where(eq(recurringJobs.id, params.id));

    if (!rj) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Verify recurring job's customer belongs to tenant
    const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, rj.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [customer] = await db
      .select({ id: customers.id, name: customers.name, phone: customers.phone, email: customers.email })
      .from(customers)
      .where(eq(customers.id, rj.customerId));
    const [vehicle] = rj.vehicleId
      ? await db
          .select({ id: vehicles.id, make: vehicles.make, model: vehicles.model, year: vehicles.year })
          .from(vehicles)
          .where(eq(vehicles.id, rj.vehicleId))
      : [null];

    return NextResponse.json({ ...rj, customer, vehicle });
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
    const { session: _session, tenantId } = auth;

    const db = getDb();

    // Verify recurring job's customer belongs to tenant
    const [existing] = await db.select().from(recurringJobs).where(eq(recurringJobs.id, params.id));
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const [custCheckPut] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, existing.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheckPut) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    if (body.frequency !== undefined) updateData.frequency = body.frequency;
    if (body.dayOfWeek !== undefined) updateData.dayOfWeek = body.dayOfWeek;
    if (body.timeOfDay !== undefined) updateData.timeOfDay = body.timeOfDay;
    if (body.services !== undefined) updateData.services = body.services;
    if (body.addOns !== undefined) updateData.addOns = body.addOns;
    if (body.location !== undefined) updateData.location = body.location;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.totalPrice !== undefined) updateData.totalPrice = body.totalPrice;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.vehicleId !== undefined) updateData.vehicleId = body.vehicleId || null;
    if (body.nextRunDate !== undefined)
      updateData.nextRunDate = body.nextRunDate ? new Date(body.nextRunDate).toISOString() : null;

    const [rj] = await db
      .update(recurringJobs)
      .set(updateData)
      .where(eq(recurringJobs.id, params.id))
      .returning();

    const [customer] = await db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(eq(customers.id, rj.customerId));
    const [vehicle] = rj.vehicleId
      ? await db
          .select({ id: vehicles.id, make: vehicles.make, model: vehicles.model, year: vehicles.year })
          .from(vehicles)
          .where(eq(vehicles.id, rj.vehicleId))
      : [null];

    return NextResponse.json({ ...rj, customer, vehicle });
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
    const { session: _session, tenantId } = auth;

    const db = getDb();

    // Verify recurring job's customer belongs to tenant
    const [existingDel] = await db.select().from(recurringJobs).where(eq(recurringJobs.id, params.id));
    if (!existingDel) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const [custCheckDel] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, existingDel.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheckDel) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.delete(recurringJobs).where(eq(recurringJobs.id, params.id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
