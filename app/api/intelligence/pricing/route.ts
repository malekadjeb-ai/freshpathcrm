import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { jobs, jobServices, serviceItems, customers } from "@/src/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const { searchParams } = new URL(req.url);
    const serviceId = searchParams.get("serviceId");

    const db = getDb();

    // Pre-fetch tenant customer IDs for scoping
    const tenantCustRows = await db.select({ id: customers.id }).from(customers).where(eq(customers.tenantId, tenantId));
    const tenantCustIds = tenantCustRows.map(c => c.id);

    // Get all completed jobs with services, scoped to tenant
    const completedJobs = tenantCustIds.length
      ? await db.select().from(jobs).where(and(inArray(jobs.status, ["Completed", "Paid"]), inArray(jobs.customerId, tenantCustIds)))
      : [];

    const serviceMap = new Map<string, {
      name: string;
      prices: number[];
      cities: Map<string, number[]>;
    }>();

    for (const job of completedJobs) {
      const svcs = await db.select({ jobService: jobServices, serviceItem: serviceItems })
        .from(jobServices)
        .leftJoin(serviceItems, eq(jobServices.serviceItemId, serviceItems.id))
        .where(eq(jobServices.jobId, job.id));

      const customer = await db.select({ city: customers.city }).from(customers).where(eq(customers.id, job.customerId)).limit(1).then(r => r[0]);

      for (const svc of svcs) {
        const key = svc.jobService.serviceItemId || `custom-${svc.jobService.id}`;
        if (serviceId && key !== serviceId) continue;

        if (!serviceMap.has(key)) {
          serviceMap.set(key, {
            name: svc.serviceItem?.name || "Unknown",
            prices: [],
            cities: new Map(),
          });
        }
        const entry = serviceMap.get(key)!;
        entry.prices.push(svc.jobService.price);

        const city = customer?.city || "Other";
        if (!entry.cities.has(city)) entry.cities.set(city, []);
        entry.cities.get(city)!.push(svc.jobService.price);
      }
    }

    const suggestions = Array.from(serviceMap.entries()).map(([id, data]) => {
      const sorted = [...data.prices].sort((a, b) => a - b);
      const avg = sorted.reduce((s, p) => s + p, 0) / sorted.length;
      const median = sorted[Math.floor(sorted.length / 2)];
      const min = sorted[0];
      const max = sorted[sorted.length - 1];

      const cityPricing: { city: string; avg: number; count: number }[] = [];
      data.cities.forEach((prices, city) => {
        cityPricing.push({
          city,
          avg: Math.round(prices.reduce((s, p) => s + p, 0) / prices.length),
          count: prices.length,
        });
      });

      const suggested = Math.round(median * (data.prices.length >= 20 ? 1.08 : 1.05));

      return {
        serviceId: id,
        name: data.name,
        count: data.prices.length,
        avg: Math.round(avg),
        median: Math.round(median),
        min: Math.round(min),
        max: Math.round(max),
        suggested,
        cityPricing: cityPricing.sort((a, b) => b.avg - a.avg),
      };
    }).sort((a, b) => b.count - a.count);

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
