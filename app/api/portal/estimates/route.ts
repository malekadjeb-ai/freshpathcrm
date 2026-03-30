import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/src/db";
import { customers, portalSessions, estimates, estimateItems, vehicles } from "@/src/db/schema";
import { eq, and, gte, isNull, desc, inArray } from "drizzle-orm";

async function getPortalCustomer(req: NextRequest) {
  const token = req.cookies.get("portal-session")?.value;
  if (!token) return null;

  const db = getDb();
  const session = await db.select().from(portalSessions).where(
    and(
      eq(portalSessions.token, token),
      gte(portalSessions.expiresAt, new Date().toISOString())
    )
  ).limit(1).then(r => r[0]);

  if (!session) return null;

  const customer = await db.select().from(customers).where(eq(customers.id, session.customerId)).limit(1).then(r => r[0]);

  await db.update(portalSessions).set({ lastActive: new Date().toISOString() }).where(eq(portalSessions.id, session.id));

  return customer ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const customer = await getPortalCustomer(req);
    if (!customer) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const db = getDb();
    const customerEstimates = await db.select().from(estimates).where(
      and(
        eq(estimates.customerId, customer.id),
        isNull(estimates.deletedAt)
      )
    ).orderBy(desc(estimates.createdAt));

    // Batch: fetch all line items and vehicles for all estimates
    const portalEstIds = customerEstimates.map(e => e.id);
    const portalEstVehIds = [...new Set(customerEstimates.filter(e => e.vehicleId).map(e => e.vehicleId!))];

    const [portalEstItems, portalEstVehicles] = await Promise.all([
      portalEstIds.length ? db.select().from(estimateItems).where(inArray(estimateItems.estimateId, portalEstIds)) : Promise.resolve([]),
      portalEstVehIds.length ? db.select({ id: vehicles.id, year: vehicles.year, make: vehicles.make, model: vehicles.model }).from(vehicles).where(inArray(vehicles.id, portalEstVehIds)) : Promise.resolve([]),
    ]);

    const portalEstItemsMap = new Map<string, (typeof portalEstItems)[number][]>();
    for (const li of portalEstItems) {
      if (!portalEstItemsMap.has(li.estimateId)) portalEstItemsMap.set(li.estimateId, []);
      portalEstItemsMap.get(li.estimateId)!.push(li);
    }
    const portalEstVehMap = new Map(portalEstVehicles.map(v => [v.id, v]));

    const enriched = customerEstimates.map((est) => ({
      ...est,
      lineItems: portalEstItemsMap.get(est.id) || [],
      vehicle: est.vehicleId ? portalEstVehMap.get(est.vehicleId) ?? null : null,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Portal estimates error:", error);
    return NextResponse.json({ error: "Failed to fetch estimates" }, { status: 500 });
  }
}
