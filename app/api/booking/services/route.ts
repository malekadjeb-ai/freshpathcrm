import { NextResponse } from "next/server";
import { getDb } from "@/src/db";
import { businessSettings, serviceItems, vehicleTypeModifiers } from "@/src/db/schema";
import { and, eq, isNull, asc } from "drizzle-orm";

export async function GET() {
  try {
    const db = getDb();
    const settings = await db.select().from(businessSettings).limit(1).then(r => r[0]);
    if (!settings || !settings.bookingEnabled) {
      return NextResponse.json(
        { error: "Online booking is not currently available" },
        { status: 400 }
      );
    }

    const services = await db.select({
      id: serviceItems.id,
      name: serviceItems.name,
      description: serviceItems.description,
      basePrice: serviceItems.basePrice,
      category: serviceItems.category,
      estimatedMinutes: serviceItems.estimatedMinutes,
      sortOrder: serviceItems.sortOrder,
    }).from(serviceItems).where(
      and(eq(serviceItems.isActive, true), isNull(serviceItems.deletedAt))
    ).orderBy(asc(serviceItems.sortOrder), asc(serviceItems.name));

    // Fetch modifiers for each service
    const enriched = await Promise.all(services.map(async (svc) => {
      const modifiers = await db.select({
        vehicleType: vehicleTypeModifiers.vehicleType,
        priceAdjustment: vehicleTypeModifiers.priceAdjustment,
      }).from(vehicleTypeModifiers).where(eq(vehicleTypeModifiers.serviceItemId, svc.id));
      return { ...svc, modifiers };
    }));

    return NextResponse.json(enriched);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
