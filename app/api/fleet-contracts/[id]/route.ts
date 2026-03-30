import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { fleetContracts, customers } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";
import { fleetContractSchema } from "@/lib/validations/fleet-contract";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();

    // Verify contract belongs to tenant via customer
    const [existing] = await db.select().from(fleetContracts).where(eq(fleetContracts.id, params.id));
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, existing.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const parsed = fleetContractSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.frequency !== undefined) updateData.frequency = data.frequency;
    if (data.pricePerVehicle !== undefined) updateData.pricePerVehicle = data.pricePerVehicle;
    if (data.flatRate !== undefined) updateData.flatRate = data.flatRate;
    if (data.vehicleCount !== undefined) updateData.vehicleCount = data.vehicleCount;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate).toISOString();
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate).toISOString() : null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.notes !== undefined) updateData.notes = data.notes || null;

    const [contract] = await db
      .update(fleetContracts)
      .set(updateData)
      .where(eq(fleetContracts.id, params.id))
      .returning();

    return NextResponse.json(contract);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();

    // Verify contract belongs to tenant via customer
    const [existing] = await db.select().from(fleetContracts).where(eq(fleetContracts.id, params.id));
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, existing.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.delete(fleetContracts).where(eq(fleetContracts.id, params.id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
