import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { serviceItems, vehicleTypeModifiers } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";
import { serviceItemSchema } from "@/lib/validations/service";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const body = await req.json();
    const data = serviceItemSchema.parse(body);

    const [service] = await db
      .update(serviceItems)
      .set({
        name: data.name,
        description: data.description || null,
        basePrice: data.basePrice,
        supplyCost: data.supplyCost ?? 0,
        category: data.category,
        isActive: data.isActive ?? true,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(serviceItems.id, params.id), eq(serviceItems.tenantId, tenantId)))
      .returning();

    // Replace modifiers
    await db.delete(vehicleTypeModifiers).where(eq(vehicleTypeModifiers.serviceItemId, params.id));
    if (data.modifiers?.length) {
      await db.insert(vehicleTypeModifiers).values(
        (data.modifiers as { vehicleType: string; priceAdjustment: number }[]).map((m) => ({
          serviceItemId: params.id,
          vehicleType: m.vehicleType,
          priceAdjustment: m.priceAdjustment,
        }))
      );
    }

    const modifiers = await db
      .select()
      .from(vehicleTypeModifiers)
      .where(eq(vehicleTypeModifiers.serviceItemId, params.id));

    return NextResponse.json({ ...service, modifiers });
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

    await db
      .update(serviceItems)
      .set({ isActive: false, updatedAt: new Date().toISOString() })
      .where(and(eq(serviceItems.id, params.id), eq(serviceItems.tenantId, tenantId)));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
