import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { jobs, customers, jobServices, serviceItems } from "@/src/db/schema";
import { and, gte, lte, inArray, isNull, eq } from "drizzle-orm";
import { optimizeRoute } from "@/lib/services/route-optimizer";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];

    const dayStart = dateStr + "T00:00:00";
    const dayEnd = dateStr + "T23:59:59";

    const db = getDb();

    // Pre-fetch tenant customer IDs for scoping
    const tenantCustRows = await db.select({ id: customers.id }).from(customers).where(eq(customers.tenantId, tenantId));
    const tenantCustIds = tenantCustRows.map(c => c.id);

    const dayJobs = tenantCustIds.length
      ? await db.select().from(jobs).where(
          and(
            gte(jobs.scheduledAt, dayStart),
            lte(jobs.scheduledAt, dayEnd),
            inArray(jobs.status, ["Scheduled", "InProgress"]),
            isNull(jobs.deletedAt),
            inArray(jobs.customerId, tenantCustIds)
          )
        )
      : [];

    // Batch: fetch all customers and services for day's jobs
    const routeCustIds = [...new Set(dayJobs.map(j => j.customerId))];
    const routeJobIds = dayJobs.map(j => j.id);

    const [routeCustBatch, routeSvcBatch] = await Promise.all([
      routeCustIds.length ? db.select({ id: customers.id, name: customers.name, phone: customers.phone, latitude: customers.latitude, longitude: customers.longitude, address: customers.address, city: customers.city }).from(customers).where(inArray(customers.id, routeCustIds)) : Promise.resolve([]),
      routeJobIds.length ? db.select({ jobId: jobServices.jobId, serviceItem: serviceItems }).from(jobServices).leftJoin(serviceItems, eq(jobServices.serviceItemId, serviceItems.id)).where(inArray(jobServices.jobId, routeJobIds)) : Promise.resolve([]),
    ]);

    const routeCustMap = new Map(routeCustBatch.map(c => [c.id, c]));
    const routeSvcMap = new Map<string, (typeof routeSvcBatch)[number][]>();
    for (const s of routeSvcBatch) {
      if (!routeSvcMap.has(s.jobId)) routeSvcMap.set(s.jobId, []);
      routeSvcMap.get(s.jobId)!.push(s);
    }

    const enrichedJobs = dayJobs.map((job) => ({
      ...job,
      customer: routeCustMap.get(job.customerId)!,
      services: routeSvcMap.get(job.id) || [],
    }));

    const stops = enrichedJobs
      .filter((j) => j.customer?.latitude && j.customer?.longitude)
      .map((j) => ({
        id: j.id,
        customerName: j.customer.name,
        address: j.address || j.customer.address || "",
        city: j.city || j.customer.city || "",
        lat: j.customer.latitude!,
        lng: j.customer.longitude!,
        scheduledAt: j.scheduledAt || "",
        services: j.services.map((s) => s.serviceItem?.name || ""),
        estimatedDuration: j.estimatedDuration || 60,
        status: j.status,
      }));

    const unlocated = enrichedJobs.filter(
      (j) => !j.customer?.latitude || !j.customer?.longitude
    ).map((j) => ({
      id: j.id,
      customerName: j.customer?.name || "",
      address: j.address || j.customer?.address || "",
      services: j.services.map((s) => s.serviceItem?.name || ""),
    }));

    const startLocation = { lat: 29.5857, lng: -95.7601 };
    const optimized = optimizeRoute(stops, startLocation);

    return NextResponse.json({
      date: dateStr,
      route: optimized,
      unlocatedJobs: unlocated,
      totalJobs: dayJobs.length,
    });
  } catch (error) {
    console.error("Route optimize error:", error);
    return NextResponse.json({ error: "Failed to optimize route" }, { status: 500 });
  }
}
