import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { jobs, customers, invoices, leads, payments, subscriptions, jobServices, serviceItems } from "@/src/db/schema";
import { eq, and, gte, lte, inArray, isNull } from "drizzle-orm";
import { subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "overview";
    const period = searchParams.get("period") || "30d";

    const daysBack = period === "7d" ? 7 : period === "90d" ? 90 : period === "1y" ? 365 : 30;
    const startDate = subDays(new Date(), daysBack).toISOString();
    const db = getDb();

    // Pre-fetch tenant customer IDs for scoping
    const tenantCustRows = await db.select({ id: customers.id }).from(customers).where(eq(customers.tenantId, tenantId));
    const tenantCustIds = tenantCustRows.map(c => c.id);

    switch (type) {
      case "overview": {
        const now = new Date();
        const thisMonthStart = startOfMonth(now).toISOString();
        const thisMonthEnd = endOfMonth(now).toISOString();
        const lastMonthStart = startOfMonth(subMonths(now, 1)).toISOString();
        const lastMonthEnd = endOfMonth(subMonths(now, 1)).toISOString();
        const weekAgo = subDays(now, 7).toISOString();

        const [
          thisMonthJobRows,
          lastMonthJobRows,
          thisMonthPayments,
          lastMonthPayments,
          outstandingInvoices,
          newLeadsRows,
          activeMembersRows,
          totalCustomersRows,
          completedJobsThisMonth,
        ] = await Promise.all([
          tenantCustIds.length ? db.select({ id: jobs.id }).from(jobs).where(and(gte(jobs.completedAt, thisMonthStart), lte(jobs.completedAt, thisMonthEnd), eq(jobs.status, "Completed"), isNull(jobs.deletedAt), inArray(jobs.customerId, tenantCustIds))) : Promise.resolve([]),
          tenantCustIds.length ? db.select({ id: jobs.id }).from(jobs).where(and(gte(jobs.completedAt, lastMonthStart), lte(jobs.completedAt, lastMonthEnd), eq(jobs.status, "Completed"), isNull(jobs.deletedAt), inArray(jobs.customerId, tenantCustIds))) : Promise.resolve([]),
          db.select({ amount: payments.amount }).from(payments).where(and(gte(payments.paymentDate, thisMonthStart), lte(payments.paymentDate, thisMonthEnd))),
          db.select({ amount: payments.amount }).from(payments).where(and(gte(payments.paymentDate, lastMonthStart), lte(payments.paymentDate, lastMonthEnd))),
          tenantCustIds.length ? db.select({ total: invoices.total }).from(invoices).leftJoin(jobs, eq(invoices.jobId, jobs.id)).where(and(inArray(invoices.status, ["Sent", "Overdue"]), isNull(invoices.deletedAt), inArray(jobs.customerId, tenantCustIds))) : Promise.resolve([]),
          db.select({ id: leads.id }).from(leads).where(and(gte(leads.createdAt, weekAgo), eq(leads.tenantId, tenantId))),
          tenantCustIds.length ? db.select({ id: subscriptions.id }).from(subscriptions).where(and(eq(subscriptions.status, "active"), inArray(subscriptions.customerId, tenantCustIds))) : Promise.resolve([]),
          db.select({ id: customers.id }).from(customers).where(and(isNull(customers.deletedAt), eq(customers.tenantId, tenantId))),
          tenantCustIds.length ? db.select({ total: jobs.total }).from(jobs).where(and(eq(jobs.status, "Completed"), isNull(jobs.deletedAt), gte(jobs.completedAt, thisMonthStart), inArray(jobs.customerId, tenantCustIds))) : Promise.resolve([]),
        ]);

        const thisRev = thisMonthPayments.reduce((s, p) => s + p.amount, 0);
        const lastRev = lastMonthPayments.reduce((s, p) => s + p.amount, 0);
        const revChange = lastRev > 0 ? ((thisRev - lastRev) / lastRev) * 100 : 0;
        const jobChange = lastMonthJobRows.length > 0 ? ((thisMonthJobRows.length - lastMonthJobRows.length) / lastMonthJobRows.length) * 100 : 0;
        const avgTicket = completedJobsThisMonth.length > 0
          ? completedJobsThisMonth.reduce((s, j) => s + j.total, 0) / completedJobsThisMonth.length
          : 0;

        return NextResponse.json({
          revenueThisMonth: thisRev,
          revenueLastMonth: lastRev,
          revenueChange: Math.round(revChange),
          jobsThisMonth: thisMonthJobRows.length,
          jobsLastMonth: lastMonthJobRows.length,
          jobsChange: Math.round(jobChange),
          avgTicketValue: Math.round(avgTicket),
          outstandingAmount: outstandingInvoices.reduce((s, i) => s + i.total, 0),
          newLeadsThisWeek: newLeadsRows.length,
          activeMembers: activeMembersRows.length,
          totalCustomers: totalCustomersRows.length,
        });
      }

      case "revenue": {
        const paymentRows = await db.select({ amount: payments.amount, method: payments.method, paymentDate: payments.paymentDate })
          .from(payments)
          .where(gte(payments.paymentDate, startDate));

        const byDay = new Map<string, number>();
        const byMethod = new Map<string, number>();
        for (const p of paymentRows) {
          const day = p.paymentDate.split("T")[0];
          byDay.set(day, (byDay.get(day) || 0) + p.amount);
          byMethod.set(p.method, (byMethod.get(p.method) || 0) + p.amount);
        }

        return NextResponse.json({
          daily: Array.from(byDay.entries()).map(([date, amount]) => ({ date, amount })),
          byMethod: Array.from(byMethod.entries()).map(([method, amount]) => ({ method, amount })),
          total: paymentRows.reduce((s, p) => s + p.amount, 0),
        });
      }

      case "leads": {
        const leadRows = await db.select({ source: leads.source, status: leads.status, estimatedValue: leads.estimatedValue, responseTime: leads.responseTime, createdAt: leads.createdAt })
          .from(leads)
          .where(and(gte(leads.createdAt, startDate), eq(leads.tenantId, tenantId)));

        const bySource = new Map<string, number>();
        const byStatus = new Map<string, number>();
        let totalResponseTime = 0;
        let responseCount = 0;

        for (const l of leadRows) {
          bySource.set(l.source, (bySource.get(l.source) || 0) + 1);
          byStatus.set(l.status, (byStatus.get(l.status) || 0) + 1);
          if (l.responseTime) { totalResponseTime += l.responseTime; responseCount++; }
        }

        const won = byStatus.get("Booked") || byStatus.get("Won") || 0;
        const conversionRate = leadRows.length > 0 ? (won / leadRows.length) * 100 : 0;

        return NextResponse.json({
          total: leadRows.length,
          bySource: Array.from(bySource.entries()).map(([source, count]) => ({ source, count })),
          funnel: Array.from(byStatus.entries()).map(([stage, count]) => ({ stage, count })),
          conversionRate: Math.round(conversionRate),
          avgResponseTime: responseCount > 0 ? Math.round(totalResponseTime / responseCount) : null,
        });
      }

      case "customers": {
        const thisMonthStartIso = startOfMonth(new Date()).toISOString();
        const [total, newThisMonth, atRisk, dormant] = await Promise.all([
          db.select({ id: customers.id }).from(customers).where(and(isNull(customers.deletedAt), eq(customers.tenantId, tenantId))).then(r => r.length),
          db.select({ id: customers.id }).from(customers).where(and(isNull(customers.deletedAt), eq(customers.tenantId, tenantId), gte(customers.createdAt, thisMonthStartIso))).then(r => r.length),
          db.select({ id: customers.id }).from(customers).where(and(isNull(customers.deletedAt), eq(customers.tenantId, tenantId), eq(customers.lifecycleStage, "at-risk"))).then(r => r.length),
          db.select({ id: customers.id }).from(customers).where(and(isNull(customers.deletedAt), eq(customers.tenantId, tenantId), inArray(customers.lifecycleStage, ["dormant", "lost"]))).then(r => r.length),
        ]);

        const topCustomersRaw = await db.select({ id: customers.id, name: customers.name }).from(customers).where(and(isNull(customers.deletedAt), eq(customers.tenantId, tenantId))).limit(50);
        const topCustIds = topCustomersRaw.map(c => c.id);
        const topCustJobs = topCustIds.length
          ? await db.select({ customerId: jobs.customerId, total: jobs.total }).from(jobs).where(and(inArray(jobs.customerId, topCustIds), eq(jobs.status, "Completed"), isNull(jobs.deletedAt)))
          : [];
        const topCustLtvMap = new Map<string, number>();
        for (const j of topCustJobs) {
          topCustLtvMap.set(j.customerId, (topCustLtvMap.get(j.customerId) || 0) + j.total);
        }
        const ranked = topCustomersRaw.map((c) => ({
          id: c.id, name: c.name, ltv: topCustLtvMap.get(c.id) || 0,
        }));

        return NextResponse.json({
          total,
          newThisMonth,
          atRisk,
          dormant,
          topByLTV: ranked.sort((a, b) => b.ltv - a.ltv).slice(0, 10),
        });
      }

      case "services": {
        const jobSvcRows = await db.select({ jobService: jobServices, serviceItem: serviceItems })
          .from(jobServices)
          .leftJoin(serviceItems, eq(jobServices.serviceItemId, serviceItems.id))
          .leftJoin(jobs, eq(jobServices.jobId, jobs.id))
          .where(and(gte(jobs.completedAt, startDate), isNull(jobs.deletedAt)));

        const byService = new Map<string, { count: number; revenue: number }>();
        for (const js of jobSvcRows) {
          const name = js.serviceItem?.name || "Unknown";
          const existing = byService.get(name) || { count: 0, revenue: 0 };
          existing.count += js.jobService.quantity;
          existing.revenue += js.jobService.price * js.jobService.quantity;
          byService.set(name, existing);
        }

        return NextResponse.json({
          data: Array.from(byService.entries()).map(([name, stats]) => ({ name, ...stats })).sort((a, b) => b.revenue - a.revenue),
        });
      }

      case "areas": {
        const areaJobs = await db.select({ location: jobs.location, total: jobs.total })
          .from(jobs)
          .where(and(gte(jobs.completedAt, startDate), eq(jobs.status, "Completed"), isNull(jobs.deletedAt)));

        const byArea = new Map<string, { count: number; revenue: number }>();
        for (const j of areaJobs) {
          const area = j.location || "Unknown";
          const existing = byArea.get(area) || { count: 0, revenue: 0 };
          existing.count++;
          existing.revenue += j.total;
          byArea.set(area, existing);
        }

        return NextResponse.json({
          data: Array.from(byArea.entries()).map(([area, stats]) => ({ area, ...stats })).sort((a, b) => b.revenue - a.revenue),
        });
      }

      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
