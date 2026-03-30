import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { jobs, customers, expenses, leads, estimates, campaigns, jobServices, serviceItems } from "@/src/db/schema";
import { eq, and, gte, inArray, isNull } from "drizzle-orm";
import { subDays, startOfWeek, format, getDay, getHours } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "30d";

    const now = new Date();
    let startDate = subDays(now, 30);
    if (period === "7d") startDate = subDays(now, 7);
    else if (period === "90d") startDate = subDays(now, 90);
    else if (period === "1y") startDate = subDays(now, 365);

    const startIso = startDate.toISOString();
    const completedStatuses = ["Completed", "Invoiced", "Paid"];
    const db = getDb();

    // Pre-fetch tenant customers for scoping customer-related queries
    const tenantCustRows = await db.select({ id: customers.id }).from(customers).where(eq(customers.tenantId, tenantId));
    const tenantCustIds = tenantCustRows.map(c => c.id);

    const [allJobs, allCustomers, allExpenses, allLeads, allEstimates, allCampaigns] = await Promise.all([
      tenantCustIds.length
        ? db.select().from(jobs).where(and(inArray(jobs.status, completedStatuses), gte(jobs.scheduledAt, startIso), inArray(jobs.customerId, tenantCustIds)))
        : Promise.resolve([]),
      db.select().from(customers).where(eq(customers.tenantId, tenantId)),
      db.select().from(expenses).where(and(eq(expenses.tenantId, tenantId), gte(expenses.date, startIso))),
      db.select({ id: leads.id, status: leads.status, source: leads.source, createdAt: leads.createdAt }).from(leads).where(and(eq(leads.tenantId, tenantId), gte(leads.createdAt, startIso))),
      db.select({ id: estimates.id, status: estimates.status, total: estimates.total, convertedJobId: estimates.convertedJobId, createdAt: estimates.createdAt }).from(estimates).where(gte(estimates.createdAt, startIso)),
      db.select({ id: campaigns.id, name: campaigns.name, status: campaigns.status, type: campaigns.type, sentCount: campaigns.sentCount, openedCount: campaigns.openedCount, clickedCount: campaigns.clickedCount, convertedCount: campaigns.convertedCount, audienceCount: campaigns.audienceCount }).from(campaigns).where(gte(campaigns.createdAt, startIso)),
    ]);

    // Batch: fetch all job services for all jobs at once
    const allJobIds = allJobs.map(j => j.id);
    const allJobSvcsRaw = allJobIds.length
      ? await db.select({ jobService: jobServices, serviceItem: serviceItems }).from(jobServices).leftJoin(serviceItems, eq(jobServices.serviceItemId, serviceItems.id)).where(inArray(jobServices.jobId, allJobIds))
      : [];
    const jobSvcsMap = new Map<string, (typeof allJobSvcsRaw)[number][]>();
    for (const js of allJobSvcsRaw) {
      const jobId = js.jobService.jobId;
      if (!jobSvcsMap.has(jobId)) jobSvcsMap.set(jobId, []);
      jobSvcsMap.get(jobId)!.push(js);
    }

    // Build customer lookup map from allCustomers
    const customerLookup = new Map(allCustomers.map(c => [c.id, c]));

    const enrichedJobs = allJobs.map((job) => {
      const svcs = jobSvcsMap.get(job.id) || [];
      const c = customerLookup.get(job.customerId);
      const customer = c ? { id: c.id, name: c.name, isCommercial: c.isCommercial, createdAt: c.createdAt } : { id: job.customerId, name: "", isCommercial: false, createdAt: "" };
      return { ...job, services: svcs, customer };
    });

    // Batch: fetch all completed jobs for all tenant customers at once
    const allCustomerIds = allCustomers.map(c => c.id);
    const allCompletedCustomerJobs = allCustomerIds.length
      ? await db.select({ customerId: jobs.customerId, total: jobs.total, scheduledAt: jobs.scheduledAt }).from(jobs).where(and(inArray(jobs.customerId, allCustomerIds), inArray(jobs.status, completedStatuses), isNull(jobs.deletedAt)))
      : [];
    const customerJobsMap = new Map<string, { total: number; scheduledAt: string | null }[]>();
    for (const j of allCompletedCustomerJobs) {
      if (!customerJobsMap.has(j.customerId)) customerJobsMap.set(j.customerId, []);
      customerJobsMap.get(j.customerId)!.push({ total: j.total, scheduledAt: j.scheduledAt });
    }

    const enrichedCustomers = allCustomers.map((c) => ({
      id: c.id, name: c.name, createdAt: c.createdAt, jobs: customerJobsMap.get(c.id) || [],
    }));

    // Revenue by period
    const revenueByWeek = enrichedJobs.reduce((acc: Record<string, number>, job) => {
      if (!job.scheduledAt) return acc;
      const week = format(startOfWeek(new Date(job.scheduledAt)), "MMM d");
      acc[week] = (acc[week] ?? 0) + job.total;
      return acc;
    }, {});

    const revenueByService: Record<string, number> = {};
    enrichedJobs.forEach((job) => {
      job.services.forEach((s) => {
        const name = s.serviceItem?.name || "Unknown";
        revenueByService[name] = (revenueByService[name] ?? 0) + s.jobService.price;
      });
    });

    const revenueByLocation: Record<string, number> = {};
    enrichedJobs.forEach((job) => {
      revenueByLocation[job.location] = (revenueByLocation[job.location] ?? 0) + job.total;
    });

    const avgTicket = enrichedJobs.length > 0
      ? enrichedJobs.reduce((s, j) => s + j.total, 0) / enrichedJobs.length
      : 0;

    const jobsWithAddons = enrichedJobs.filter((j) =>
      j.services.some((s) => s.serviceItem?.category === "AddOn")
    ).length;
    const addOnAttachRate = enrichedJobs.length > 0 ? (jobsWithAddons / enrichedJobs.length) * 100 : 0;

    const existingCustomerIds = new Set<string>();
    const sortedJobs = [...enrichedJobs].sort(
      (a, b) => (a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0) - (b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0)
    );
    let newCustomers = 0;
    let returningCustomers = 0;
    sortedJobs.forEach((job) => {
      if (!existingCustomerIds.has(job.customerId)) {
        existingCustomerIds.add(job.customerId);
        newCustomers++;
      } else {
        returningCustomers++;
      }
    });

    const churnDate = subDays(now, 60);
    const churnedCustomers = enrichedCustomers.filter((c) => {
      const lastJob = c.jobs
        .filter((j) => j.scheduledAt)
        .sort((a, b) => new Date(b.scheduledAt!).getTime() - new Date(a.scheduledAt!).getTime())[0];
      return lastJob && new Date(lastJob.scheduledAt!) < churnDate;
    });

    const ltvBuckets = { "0-200": 0, "200-500": 0, "500-1000": 0, "1000+": 0 };
    enrichedCustomers.forEach((c) => {
      const ltv = c.jobs.reduce((s, j) => s + j.total, 0);
      if (ltv < 200) ltvBuckets["0-200"]++;
      else if (ltv < 500) ltvBuckets["200-500"]++;
      else if (ltv < 1000) ltvBuckets["500-1000"]++;
      else ltvBuckets["1000+"]++;
    });

    const totalExpenses = allExpenses.reduce((s, e) => s + e.amount, 0);
    const totalRevenue = enrichedJobs.reduce((s, j) => s + j.total, 0);

    const expensesByCategory: Record<string, number> = {};
    allExpenses.forEach((e) => {
      expensesByCategory[e.category] = (expensesByCategory[e.category] ?? 0) + e.amount;
    });

    const expensesByWeek = allExpenses.reduce((acc: Record<string, number>, e) => {
      const week = format(startOfWeek(new Date(e.date)), "MMM d");
      acc[week] = (acc[week] ?? 0) + e.amount;
      return acc;
    }, {});

    const allWeeks = Array.from(new Set([...Object.keys(revenueByWeek), ...Object.keys(expensesByWeek)]));
    const profitByWeek = allWeeks
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .map((week) => ({
        week,
        revenue: revenueByWeek[week] ?? 0,
        expenses: expensesByWeek[week] ?? 0,
        profit: (revenueByWeek[week] ?? 0) - (expensesByWeek[week] ?? 0),
      }));

    const totalMileage = enrichedJobs.reduce((s, j) => s + (j.mileage ?? 0), 0);
    const totalTravelTime = enrichedJobs.reduce((s, j) => s + (j.travelTime ?? 0), 0);
    const jobsWithMileage = enrichedJobs.filter((j) => j.mileage && j.mileage > 0);
    const avgMileagePerJob = jobsWithMileage.length > 0 ? totalMileage / jobsWithMileage.length : 0;
    const mileageCost = totalMileage * 0.67;

    const leadsByStatus: Record<string, number> = {};
    const leadsBySource: Record<string, number> = {};
    allLeads.forEach((l) => {
      leadsByStatus[l.status] = (leadsByStatus[l.status] ?? 0) + 1;
      leadsBySource[l.source] = (leadsBySource[l.source] ?? 0) + 1;
    });
    const convertedLeads = allLeads.filter((l) => l.status === "Converted").length;
    const leadConversionRate = allLeads.length > 0 ? (convertedLeads / allLeads.length) * 100 : 0;

    const convertedEstimates = allEstimates.filter((e) => e.convertedJobId).length;
    const estimateConversionRate = allEstimates.length > 0 ? (convertedEstimates / allEstimates.length) * 100 : 0;
    const estimatesByStatus: Record<string, number> = {};
    allEstimates.forEach((e) => {
      estimatesByStatus[e.status] = (estimatesByStatus[e.status] ?? 0) + 1;
    });

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const jobsByDayOfWeek = dayNames.map((day) => ({ day, jobs: 0, revenue: 0 }));
    const jobsByHour: Record<number, { hour: number; jobs: number; revenue: number }> = {};
    for (let h = 6; h <= 20; h++) {
      jobsByHour[h] = { hour: h, jobs: 0, revenue: 0 };
    }
    enrichedJobs.forEach((j) => {
      if (!j.scheduledAt) return;
      const dow = getDay(new Date(j.scheduledAt));
      jobsByDayOfWeek[dow].jobs++;
      jobsByDayOfWeek[dow].revenue += j.total;
      const hour = getHours(new Date(j.scheduledAt));
      if (jobsByHour[hour]) {
        jobsByHour[hour].jobs++;
        jobsByHour[hour].revenue += j.total;
      }
    });

    const revenueByLocationSorted = Object.entries(revenueByLocation)
      .map(([location, revenue]) => ({ location, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    const commercialRevenue = enrichedJobs
      .filter((j) => j.customer.isCommercial)
      .reduce((s, j) => s + j.total, 0);
    const residentialRevenue = totalRevenue - commercialRevenue;

    const campaignStats = {
      total: allCampaigns.length,
      sent: allCampaigns.filter((c) => c.status === "Sent").length,
      totalSent: allCampaigns.reduce((s, c) => s + c.sentCount, 0),
      totalOpened: allCampaigns.reduce((s, c) => s + c.openedCount, 0),
      totalClicked: allCampaigns.reduce((s, c) => s + c.clickedCount, 0),
      totalConverted: allCampaigns.reduce((s, c) => s + c.convertedCount, 0),
    };

    return NextResponse.json({
      revenue: {
        byWeek: Object.entries(revenueByWeek).map(([week, revenue]) => ({ week, revenue })),
        byService: Object.entries(revenueByService).map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue),
        byLocation: revenueByLocationSorted,
        total: totalRevenue,
        commercial: commercialRevenue,
        residential: residentialRevenue,
      },
      expenses: {
        total: totalExpenses,
        profit: totalRevenue - totalExpenses,
        profitMargin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0,
        byCategory: Object.entries(expensesByCategory).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
        profitByWeek,
      },
      performance: {
        avgTicket,
        totalJobs: enrichedJobs.length,
        addOnAttachRate,
        addOnRevenue: enrichedJobs.reduce((s, j) => {
          return s + j.services.filter((srv) => srv.serviceItem?.category === "AddOn").reduce((a, srv) => a + srv.jobService.price, 0);
        }, 0),
      },
      customers: {
        newVsReturning: [
          { name: "New", value: newCustomers },
          { name: "Returning", value: returningCustomers },
        ],
        ltvDistribution: Object.entries(ltvBuckets).map(([range, count]) => ({ range, count })),
        churnedCount: churnedCustomers.length,
        churnedCustomers: churnedCustomers.slice(0, 10).map((c) => ({
          id: c.id,
          name: c.name,
          lastService: c.jobs
            .filter((j) => j.scheduledAt)
            .sort((a, b) => new Date(b.scheduledAt!).getTime() - new Date(a.scheduledAt!).getTime())[0]
            ?.scheduledAt ?? null,
          totalSpent: c.jobs.reduce((s, j) => s + j.total, 0),
        })),
      },
      route: {
        totalMileage: Math.round(totalMileage * 10) / 10,
        totalTravelTime,
        avgMileagePerJob: Math.round(avgMileagePerJob * 10) / 10,
        mileageCost: Math.round(mileageCost * 100) / 100,
        jobsTracked: jobsWithMileage.length,
      },
      leads: {
        total: allLeads.length,
        converted: convertedLeads,
        conversionRate: Math.round(leadConversionRate * 10) / 10,
        byStatus: Object.entries(leadsByStatus).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count),
        bySource: Object.entries(leadsBySource).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count),
      },
      estimates: {
        total: allEstimates.length,
        converted: convertedEstimates,
        conversionRate: Math.round(estimateConversionRate * 10) / 10,
        totalValue: allEstimates.reduce((s, e) => s + e.total, 0),
        byStatus: Object.entries(estimatesByStatus).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count),
      },
      scheduling: {
        byDayOfWeek: jobsByDayOfWeek,
        byHour: Object.values(jobsByHour),
      },
      campaigns: campaignStats,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
