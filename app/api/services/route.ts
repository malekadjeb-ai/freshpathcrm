import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { serviceItems, vehicleTypeModifiers } from "@/src/db/schema";
import { eq, and, asc, inArray } from "drizzle-orm";
import { serviceItemSchema } from "@/lib/validations/service";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "";
    const activeOnly = searchParams.get("active") === "true";

    const conditions = [eq(serviceItems.tenantId, tenantId)];
    if (category) conditions.push(eq(serviceItems.category, category));
    if (activeOnly) conditions.push(eq(serviceItems.isActive, true));

    const serviceRows = await db
      .select()
      .from(serviceItems)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(serviceItems.category), asc(serviceItems.name));

    // Batch: fetch all modifiers for all services
    const serviceIds = serviceRows.map(s => s.id);
    const allModifiers = serviceIds.length
      ? await db.select().from(vehicleTypeModifiers).where(inArray(vehicleTypeModifiers.serviceItemId, serviceIds))
      : [];

    const modifierMap = new Map<string, (typeof allModifiers)[number][]>();
    for (const m of allModifiers) {
      if (!modifierMap.has(m.serviceItemId)) modifierMap.set(m.serviceItemId, []);
      modifierMap.get(m.serviceItemId)!.push(m);
    }

    const enriched = serviceRows.map((s) => ({
      ...s,
      modifiers: modifierMap.get(s.id) || [],
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
    const data = serviceItemSchema.parse(body);

    const [service] = await db
      .insert(serviceItems)
      .values({
        tenantId,
        name: data.name,
        description: data.description || null,
        basePrice: data.basePrice,
        supplyCost: data.supplyCost ?? 0,
        category: data.category,
        isActive: data.isActive ?? true,
      })
      .returning();

    // Insert modifiers if provided
    if (data.modifiers?.length) {
      await db.insert(vehicleTypeModifiers).values(
        data.modifiers.map((m: { vehicleType: string; priceAdjustment: number }) => ({
          serviceItemId: service.id,
          vehicleType: m.vehicleType,
          priceAdjustment: m.priceAdjustment,
        }))
      );
    }

    const modifiers = await db
      .select()
      .from(vehicleTypeModifiers)
      .where(eq(vehicleTypeModifiers.serviceItemId, service.id));

    return NextResponse.json({ ...service, modifiers }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
