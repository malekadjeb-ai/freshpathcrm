import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import {
  jobs, customers, invoices, estimates, expenses, reviews,
  recurringJobs, leads, tasks, payments, communications,
  jobServices, serviceItems, vehicles, businessSettings,
} from "@/src/db/schema";
import { eq, and, gte, lte, lt, inArray, not, notInArray, isNull, isNotNull, ne, desc, asc, sql } from "drizzle-orm";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, subMonths, format } from "date-fns";

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const now = new Date();
    const todayStart = startOfDay(now).toISOString();
    const todayEnd = endOfDay(now).toISOString();
    const monthStart = startOfMonth(now).toISOString();
    const monthEnd = endOfMonth(now).toISOString();
    const weekStart = subDays(now, 7).toISOString();
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
    const lastMonthStart = startOfMonth(subMonths(now, 1)).toISOString();
    const lastMonthEnd = endOfMonth(subMonths(now, 1)).toISOString();
    const sixtyDaysAgo = subDays(now, 60).toISOString();
    const ninetyDaysAgo = subDays(now, 90).toISOString();
    const nowIso = now.toISOString();

    const completedStatuses = ["Completed", "Invoiced", "Paid"];

    // ─── Aggregations ─────────────────────────────────────────────
    const [
      todayJobs,
      monthJobs,
      lastMonthJobs,
      completedJobs,
      weekJobRows,
      allCompletedJobs,
      outstandingInvoices,
      pendingEstimates,
      monthExpenses,
      todayExpenses,
      pendingReviewsRows,
      completedReviewsRows,
      activeRecurringRows,
      newLeadsRows,
      quotedLeadsRows,
      wonLeadsRows,
      dueTodayTasksRows,
      overdueTasksRows,
    ] = await Promise.all([
      db.select({ total: jobs.total }).from(jobs).where(and(isNull(jobs.deletedAt), gte(jobs.scheduledAt, todayStart), lte(jobs.scheduledAt, todayEnd), ne(jobs.status, "Cancelled"))),
      db.select({ total: jobs.total }).from(jobs).where(and(isNull(jobs.deletedAt), gte(jobs.scheduledAt, monthStart), lte(jobs.scheduledAt, monthEnd), eq(jobs.status, "Paid"))),
      db.select({ total: jobs.total }).from(jobs).where(and(isNull(jobs.deletedAt), gte(jobs.scheduledAt, lastMonthStart), lte(jobs.scheduledAt, lastMonthEnd), eq(jobs.status, "Paid"))),
      db.select({ id: jobs.id }).from(jobs).where(and(isNull(jobs.deletedAt), inArray(jobs.status, completedStatuses))),
      db.select({ id: jobs.id }).from(jobs).where(and(isNull(jobs.deletedAt), gte(jobs.scheduledAt, weekStart), lte(jobs.scheduledAt, nowIso), ne(jobs.status, "Cancelled"))),
      db.select({ total: jobs.total }).from(jobs).where(and(isNull(jobs.deletedAt), inArray(jobs.status, completedStatuses))),
      db.select({ total: invoices.total }).from(invoices).where(and(isNull(invoices.deletedAt), inArray(invoices.status, ["Sent", "Overdue"]))),
      db.select({ total: estimates.total }).from(estimates).where(and(isNull(estimates.deletedAt), eq(estimates.status, "Sent"))),
      db.select({ amount: expenses.amount }).from(expenses).where(and(eq(expenses.tenantId, tenantId), gte(expenses.date, monthStart), lte(expenses.date, monthEnd))),
      db.select({ amount: expenses.amount }).from(expenses).where(and(eq(expenses.tenantId, tenantId), gte(expenses.date, todayStart), lte(expenses.date, todayEnd))),
      db.select({ id: reviews.id }).from(reviews).where(eq(reviews.status, "pending")),
      db.select({ id: reviews.id }).from(reviews).where(eq(reviews.status, "completed")),
      db.select({ id: recurringJobs.id }).from(recurringJobs).where(eq(recurringJobs.isActive, true)),
      db.select({ id: leads.id }).from(leads).where(and(eq(leads.tenantId, tenantId), inArray(leads.status, ["New", "Contacted"]))),
      db.select({ id: leads.id }).from(leads).where(and(eq(leads.tenantId, tenantId), eq(leads.status, "Quoted"))),
      db.select({ id: leads.id }).from(leads).where(and(eq(leads.tenantId, tenantId), inArray(leads.status, ["Won", "Booked"]))),
      db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.completed, false), gte(tasks.dueDate, todayStart), lte(tasks.dueDate, todayEnd))),
      db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.completed, false), lt(tasks.dueDate, todayStart))),
    ]);

    const todayRevenue = todayJobs.reduce((s, j) => s + (j.total || 0), 0);
    const monthRevenue = monthJobs.reduce((s, j) => s + (j.total || 0), 0);
    const lastMonthRevenue = lastMonthJobs.reduce((s, j) => s + (j.total || 0), 0);
    const avgTicket = allCompletedJobs.length > 0
      ? allCompletedJobs.reduce((s, j) => s + (j.total || 0), 0) / allCompletedJobs.length
      : 0;
    const monthExpenseTotal = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const todayExpenseTotal = todayExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const monthProfit = monthRevenue - monthExpenseTotal;
    const outstandingTotal = outstandingInvoices.reduce((s, i) => s + (i.total || 0), 0);
    const pipelineCount = pendingEstimates.length;
    const pipelineTotal = pendingEstimates.reduce((s, e) => s + (e.total || 0), 0);

    // High-value and dormant customers
    const [allCustomers, customersWithJobs] = await Promise.all([
      db.select({ id: customers.id, lastContactedAt: customers.lastContactedAt }).from(customers).where(and(isNull(customers.deletedAt), eq(customers.tenantId, tenantId))),
      db.select({ customerId: jobs.customerId }).from(jobs).where(and(isNull(jobs.deletedAt), inArray(jobs.status, completedStatuses))),
    ]);
    const customerIdsWithJobs = new Set(customersWithJobs.map(j => j.customerId));
    const highValueCustomers = allCustomers.filter(c => customerIdsWithJobs.has(c.id)).length;
    const dormantCustomers = allCustomers.filter(c =>
      c.lastContactedAt && c.lastContactedAt < ninetyDaysAgo && customerIdsWithJobs.has(c.id)
    ).length;

    // ─── List queries ──────────────────────────────────────────────
    const [
      recentJobsList,
      upcomingJobsList,
      recentPaymentsList,
      recentCommunicationsList,
      recentReviewsList,
      upcomingRecurringList,
      upcoming48hList,
      topTasksList,
      needsFollowUpList,
    ] = await Promise.all([
      db.select().from(jobs).where(and(isNull(jobs.deletedAt), notInArray(jobs.status, ["Scheduled"]))).orderBy(desc(jobs.updatedAt)).limit(10),
      db.select().from(jobs).where(and(isNull(jobs.deletedAt), gte(jobs.scheduledAt, todayStart), lte(jobs.scheduledAt, todayEnd), eq(jobs.status, "Scheduled"))).orderBy(asc(jobs.scheduledAt)).limit(10),
      db.select().from(payments).orderBy(desc(payments.createdAt)).limit(5),
      db.select().from(communications).where(and(isNull(communications.deletedAt), isNotNull(communications.customerId))).orderBy(desc(communications.createdAt)).limit(5),
      db.select().from(reviews).orderBy(desc(reviews.createdAt)).limit(5),
      db.select().from(recurringJobs).where(and(eq(recurringJobs.isActive, true), gte(recurringJobs.nextRunDate, nowIso), lte(recurringJobs.nextRunDate, subDays(now, -7).toISOString()))).orderBy(asc(recurringJobs.nextRunDate)).limit(5),
      db.select().from(jobs).where(and(isNull(jobs.deletedAt), gte(jobs.scheduledAt, nowIso), lte(jobs.scheduledAt, in48Hours), eq(jobs.status, "Scheduled"))).orderBy(asc(jobs.scheduledAt)),
      db.select({ id: tasks.id, title: tasks.title, dueDate: tasks.dueDate, priority: tasks.priority }).from(tasks).where(and(eq(tasks.completed, false), lte(tasks.dueDate, todayEnd))).orderBy(asc(tasks.dueDate)).limit(5),
      db.select({ id: customers.id, name: customers.name, phone: customers.phone, lastContactedAt: customers.lastContactedAt }).from(customers).where(and(isNull(customers.deletedAt), eq(customers.tenantId, tenantId), lt(customers.lastContactedAt, sixtyDaysAgo))).orderBy(asc(customers.lastContactedAt)).limit(10),
    ]);

    // Collect all IDs needed for batch lookups
    const allJobLists = [...recentJobsList, ...upcomingJobsList, ...upcoming48hList];
    const allCustomerIds = [...new Set([
      ...allJobLists.map(j => j.customerId),
      ...recentCommunicationsList.filter(c => c.customerId).map(c => c.customerId!),
      ...recentReviewsList.map(r => r.customerId),
      ...upcomingRecurringList.map(rj => rj.customerId),
    ])];
    const allVehicleIds = [...new Set([
      ...upcomingJobsList.filter(j => j.vehicleId).map(j => j.vehicleId!),
      ...upcoming48hList.filter(j => j.vehicleId).map(j => j.vehicleId!),
    ])];
    const allJobIds = [...new Set([
      ...upcomingJobsList.map(j => j.id),
      ...upcoming48hList.map(j => j.id),
    ])];
    const allInvoiceIds = [...new Set(recentPaymentsList.map(p => p.invoiceId))];

    // Batch queries
    const [customerBatch, vehicleBatch, jobServiceBatch, invoiceBatch] = await Promise.all([
      allCustomerIds.length ? db.select({ id: customers.id, name: customers.name }).from(customers).where(inArray(customers.id, allCustomerIds)) : Promise.resolve([]),
      allVehicleIds.length ? db.select().from(vehicles).where(inArray(vehicles.id, allVehicleIds)) : Promise.resolve([]),
      allJobIds.length ? db.select({ jobService: jobServices, serviceItem: serviceItems }).from(jobServices).leftJoin(serviceItems, eq(jobServices.serviceItemId, serviceItems.id)).where(inArray(jobServices.jobId, allJobIds)) : Promise.resolve([]),
      allInvoiceIds.length ? db.select().from(invoices).where(inArray(invoices.id, allInvoiceIds)) : Promise.resolve([]),
    ]);

    const customerMap = new Map(customerBatch.map(c => [c.id, c]));
    const vehicleMap = new Map(vehicleBatch.map(v => [v.id, v]));
    const jobServiceMap = new Map<string, (typeof jobServiceBatch)[number][]>();
    for (const js of jobServiceBatch) {
      const jobId = js.jobService.jobId;
      if (!jobServiceMap.has(jobId)) jobServiceMap.set(jobId, []);
      jobServiceMap.get(jobId)!.push(js);
    }
    const invoiceMap = new Map(invoiceBatch.map(i => [i.id, i]));

    // For payments: batch lookup jobs referenced by invoices, then customers for those jobs
    const invoiceJobIds = [...new Set(invoiceBatch.filter(i => i.jobId).map(i => i.jobId!))];
    const paymentJobBatch = invoiceJobIds.length
      ? await db.select().from(jobs).where(inArray(jobs.id, invoiceJobIds))
      : [];
    const paymentJobMap = new Map(paymentJobBatch.map(j => [j.id, j]));
    const paymentCustomerIds = [...new Set(paymentJobBatch.map(j => j.customerId))].filter(id => !customerMap.has(id));
    if (paymentCustomerIds.length) {
      const extraCustomers = await db.select({ id: customers.id, name: customers.name }).from(customers).where(inArray(customers.id, paymentCustomerIds));
      for (const c of extraCustomers) customerMap.set(c.id, c);
    }

    // Enrich recent jobs with customer name
    const recentJobs = recentJobsList.map((job) => {
      const customer = customerMap.get(job.customerId);
      return { ...job, customer: { name: customer?.name || "" } };
    });

    // Enrich upcoming jobs
    const upcomingJobs = upcomingJobsList.map((job) => {
      const customer = customerMap.get(job.customerId);
      const vehicle = job.vehicleId ? vehicleMap.get(job.vehicleId) ?? null : null;
      const svcs = jobServiceMap.get(job.id) || [];
      return { ...job, customer: { name: customer?.name || "" }, vehicle, services: svcs };
    });

    // Enrich recent payments
    const recentPayments = recentPaymentsList.map((payment) => {
      const invoice = invoiceMap.get(payment.invoiceId);
      if (!invoice) return { ...payment, invoice: null };
      const job = invoice.jobId ? paymentJobMap.get(invoice.jobId) ?? null : null;
      const customer = job ? customerMap.get(job.customerId) : null;
      return { ...payment, invoice: { ...invoice, job: job ? { ...job, customer: { name: customer?.name || "" } } : null } };
    });

    // Enrich recent communications
    const recentCommunications = recentCommunicationsList.map((comm) => {
      const customer = comm.customerId ? customerMap.get(comm.customerId) : null;
      return { ...comm, customer: customer ? { name: customer.name } : null };
    });

    // Enrich recent reviews
    const recentReviews = recentReviewsList.map((review) => {
      const customer = customerMap.get(review.customerId);
      return { ...review, customer: { name: customer?.name || "" }, job: { id: review.jobId } };
    });

    // Enrich upcoming recurring
    const upcomingRecurring = upcomingRecurringList.map((rj) => {
      const customer = customerMap.get(rj.customerId);
      return { ...rj, customer: { name: customer?.name || "" } };
    });

    // Enrich upcoming 48h jobs
    const upcoming48hJobs = upcoming48hList.map((job) => {
      const customer = customerMap.get(job.customerId);
      const vehicle = job.vehicleId ? vehicleMap.get(job.vehicleId) ?? null : null;
      const svcs = jobServiceMap.get(job.id) || [];
      return { ...job, customer: { name: customer?.name || "" }, vehicle, services: svcs };
    });

    // ─── Charts ────────────────────────────────────────────────────
    const thirtyDaysAgo = subDays(now, 30).toISOString();
    const revenueJobsForChart = await db.select({ scheduledAt: jobs.scheduledAt, total: jobs.total }).from(jobs).where(
      and(isNull(jobs.deletedAt), inArray(jobs.status, completedStatuses), gte(jobs.scheduledAt, thirtyDaysAgo))
    );

    const last30Days = Array.from({ length: 30 }, (_, i) => format(subDays(now, 29 - i), "yyyy-MM-dd"));
    const revenueMap: Record<string, number> = {};
    revenueJobsForChart.forEach((r) => {
      if (r.scheduledAt) {
        const key = format(new Date(r.scheduledAt), "yyyy-MM-dd");
        revenueMap[key] = (revenueMap[key] ?? 0) + (r.total ?? 0);
      }
    });
    const dailyRevenue = last30Days.map((date) => ({ date, revenue: revenueMap[date] ?? 0 }));

    // Jobs by service
    const allJobSvcs = await db.select({ jobService: jobServices, serviceItem: serviceItems })
      .from(jobServices)
      .leftJoin(serviceItems, eq(jobServices.serviceItemId, serviceItems.id))
      .leftJoin(jobs, eq(jobServices.jobId, jobs.id))
      .where(and(isNull(jobs.deletedAt), inArray(jobs.status, completedStatuses)));

    const serviceTypeCounts: Record<string, number> = {};
    allJobSvcs.forEach((js) => {
      const name = js.serviceItem?.name || "Unknown";
      serviceTypeCounts[name] = (serviceTypeCounts[name] ?? 0) + 1;
    });
    const jobsByService = Object.entries(serviceTypeCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Revenue by location
    const locationJobs = await db.select({ location: jobs.location, total: jobs.total }).from(jobs).where(
      and(isNull(jobs.deletedAt), inArray(jobs.status, completedStatuses))
    );
    const locationRevenueMap: Record<string, number> = {};
    locationJobs.forEach((j) => {
      const loc = j.location || "Unknown";
      locationRevenueMap[loc] = (locationRevenueMap[loc] ?? 0) + (j.total ?? 0);
    });
    const locationRevenue = Object.entries(locationRevenueMap).map(([location, revenue]) => ({ location, revenue }));

    // Top customers by revenue (raw SQL query)
    const topCustomersRaw = await db.all<{ name: string; value: number }>(
      sql`SELECT c.name, COALESCE(SUM(j.total), 0) as value FROM "Customer" c JOIN "Job" j ON j.customer_id = c.id AND j.deleted_at IS NULL AND j.status IN ('Completed','Invoiced','Paid') WHERE c.deleted_at IS NULL GROUP BY c.id, c.name ORDER BY value DESC LIMIT 5`
    );

    // Revenue goal
    const bSettings = await db.select({ monthlyRevenueGoal: businessSettings.monthlyRevenueGoal }).from(businessSettings).where(eq(businessSettings.tenantId, tenantId)).limit(1).then(r => r[0]);
    const revenueGoalAmount = bSettings?.monthlyRevenueGoal ?? 10000;
    const revenueGoalPercentage = revenueGoalAmount > 0
      ? Math.min(100, Math.round((monthRevenue / revenueGoalAmount) * 100))
      : 0;

    const leadsCount = newLeadsRows.length;
    const quotedCount = quotedLeadsRows.length;
    const wonCount = wonLeadsRows.length;
    const leadToQuoteRate = leadsCount > 0 ? Math.round((quotedCount / (leadsCount + quotedCount + wonCount)) * 100) : 0;
    const quoteToWinRate = quotedCount > 0 ? Math.round((wonCount / (quotedCount + wonCount)) * 100) : 0;
    const revenueChangePercent = lastMonthRevenue > 0
      ? Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : monthRevenue > 0 ? 100 : 0;

    const upcoming48h = upcoming48hJobs.map((j) => ({
      id: j.id,
      scheduledAt: j.scheduledAt,
      total: j.total,
      customer: { name: j.customer.name },
      vehicle: j.vehicle ? { make: j.vehicle.make, model: j.vehicle.model, year: j.vehicle.year } : null,
      services: j.services.map((s) => s.serviceItem?.name || ""),
      address: j.address,
    }));

    const followUpList = needsFollowUpList.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      lastVisit: c.lastContactedAt,
    }));

    return NextResponse.json({
      kpis: {
        todayRevenue,
        monthRevenue,
        totalJobs: completedJobs.length,
        avgTicket,
        weekJobs: weekJobRows.length,
        outstandingTotal,
        pendingEstimates: pipelineCount,
        pendingEstimateTotal: pipelineTotal,
        monthExpenses: monthExpenseTotal,
        todayExpenses: todayExpenseTotal,
        monthProfit,
      },
      charts: {
        dailyRevenue,
        jobsByService,
        locationRevenue,
        topCustomers: topCustomersRaw.map((c) => ({
          name: c.name,
          value: Number(c.value ?? 0),
        })),
      },
      activity: { recentJobs, upcomingJobs, recentPayments, recentCommunications, needsFollowUp: followUpList },
      reviews: { pending: pendingReviewsRows.length, completed: completedReviewsRows.length, recent: recentReviews },
      recurring: { activeCount: activeRecurringRows.length, upcoming: upcomingRecurring },
      revenueGoal: { goal: revenueGoalAmount, current: monthRevenue, percentage: revenueGoalPercentage },
      pipeline: { count: pipelineCount, total: pipelineTotal },
      funnel: { leads: leadsCount, quoted: quotedCount, won: wonCount, leadToQuoteRate, quoteToWinRate },
      upcoming48h,
      revenueComparison: { thisMonth: monthRevenue, lastMonth: lastMonthRevenue, changePercent: revenueChangePercent },
      milestones: { highValueCount: highValueCustomers, dormantCount: dormantCustomers },
      tasksDue: { dueToday: dueTodayTasksRows.length, overdue: overdueTasksRows.length, tasks: topTasksList },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
