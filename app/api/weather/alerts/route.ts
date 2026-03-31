import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { jobs, customers, jobServices, serviceItems } from "@/src/db/schema";
import { and, gte, lte, inArray, isNull, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    // Fetch weather forecast
    const weatherRes = await fetch(
      `${req.nextUrl.origin}/api/weather`,
      { headers: { cookie: req.headers.get("cookie") || "" } }
    );

    if (!weatherRes.ok) {
      return NextResponse.json({ alerts: [] });
    }

    const { forecast } = await weatherRes.json();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfToday);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const db = getDb();
    const upcomingJobs = await db.select().from(jobs).where(
      and(
        gte(jobs.scheduledAt, startOfToday.toISOString()),
        lte(jobs.scheduledAt, endOfWeek.toISOString()),
        inArray(jobs.status, ["Scheduled", "InProgress"]),
        isNull(jobs.deletedAt)
      )
    );

    // Batch: fetch all customers and services for upcoming jobs
    const weatherCustIds = [...new Set(upcomingJobs.map(j => j.customerId))];
    const weatherJobIds = upcomingJobs.map(j => j.id);

    const [weatherCustBatch, weatherSvcBatch] = await Promise.all([
      weatherCustIds.length ? db.select({ id: customers.id, name: customers.name }).from(customers).where(inArray(customers.id, weatherCustIds)) : Promise.resolve([]),
      weatherJobIds.length ? db.select({ jobId: jobServices.jobId, serviceItem: serviceItems }).from(jobServices).leftJoin(serviceItems, eq(jobServices.serviceItemId, serviceItems.id)).where(inArray(jobServices.jobId, weatherJobIds)) : Promise.resolve([]),
    ]);

    const weatherCustMap = new Map(weatherCustBatch.map(c => [c.id, c]));
    const weatherSvcMap = new Map<string, (typeof weatherSvcBatch)[number][]>();
    for (const s of weatherSvcBatch) {
      if (!weatherSvcMap.has(s.jobId)) weatherSvcMap.set(s.jobId, []);
      weatherSvcMap.get(s.jobId)!.push(s);
    }

    const alerts: Array<{
      date: string;
      weatherIcon: string;
      weatherLabel: string;
      precipProbability: number;
      riskLevel: string;
      affectedJobs: Array<{
        id: string;
        customerName: string;
        customerId: string;
        services: string[];
        isIndoor: boolean;
      }>;
    }> = [];

    for (const day of forecast) {
      if (day.riskLevel === "rain" || day.riskLevel === "caution") {
        const jobsOnDay = upcomingJobs.filter((j) => {
          if (!j.scheduledAt) return false;
          const jobDate = j.scheduledAt.split("T")[0];
          return jobDate === day.date;
        });

        if (jobsOnDay.length > 0) {
          const affectedJobs = jobsOnDay.map((j) => {
            const customer = weatherCustMap.get(j.customerId);
            const svcs = weatherSvcMap.get(j.id) || [];
            const serviceNames = svcs.map((s) => s.serviceItem?.name || "");
            const isIndoor = serviceNames.some(
              (name) =>
                name.toLowerCase().includes("interior") ||
                name.toLowerCase().includes("cabin") ||
                name.toLowerCase().includes("upholstery")
            );
            return {
              id: j.id,
              customerName: customer?.name || "",
              customerId: j.customerId,
              services: serviceNames,
              isIndoor,
            };
          });

          alerts.push({
            date: day.date,
            weatherIcon: day.weatherIcon,
            weatherLabel: day.weatherLabel,
            precipProbability: day.precipitationProbability,
            riskLevel: day.riskLevel,
            affectedJobs,
          });
        }
      }
    }

    const clearDays = forecast
      .filter((d: { riskLevel: string }) => d.riskLevel === "clear")
      .slice(0, 3)
      .map((d: { date: string; tempMax: number; weatherIcon: string }) => ({
        date: d.date,
        tempMax: d.tempMax,
        weatherIcon: d.weatherIcon,
      }));

    return NextResponse.json({ alerts, clearDays, forecast });
  } catch (error) {
    console.error("Weather alerts error:", error);
    return NextResponse.json({ alerts: [], clearDays: [], forecast: [] });
  }
}
