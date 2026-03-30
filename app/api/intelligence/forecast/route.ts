import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { jobs, expenses, leads, customers } from "@/src/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { subMonths, startOfMonth, endOfMonth, format, addMonths } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const { searchParams } = new URL(req.url);
    const months = parseInt(searchParams.get("months") || "3");

    const now = new Date();
    const db = getDb();

    // Pre-fetch tenant customer IDs for scoping
    const tenantCustRows = await db.select({ id: customers.id }).from(customers).where(eq(customers.tenantId, tenantId));
    const tenantCustIds = tenantCustRows.map(c => c.id);

    const historicalMonths: { month: string; revenue: number; jobs: number; expenses: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const start = startOfMonth(monthDate).toISOString();
      const end = endOfMonth(monthDate).toISOString();

      const [monthJobs, monthExpenses] = await Promise.all([
        tenantCustIds.length ? db.select({ total: jobs.total }).from(jobs).where(and(inArray(jobs.status, ["Completed", "Paid"]), gte(jobs.createdAt, start), lte(jobs.createdAt, end), inArray(jobs.customerId, tenantCustIds))) : Promise.resolve([]),
        db.select({ amount: expenses.amount }).from(expenses).where(and(gte(expenses.date, start), lte(expenses.date, end), eq(expenses.tenantId, tenantId))),
      ]);

      historicalMonths.push({
        month: format(monthDate, "yyyy-MM"),
        revenue: monthJobs.reduce((s, j) => s + (j.total || 0), 0),
        jobs: monthJobs.length,
        expenses: monthExpenses.reduce((s, e) => s + (e.amount || 0), 0),
      });
    }

    // Simple linear regression on last 6 months for trend
    const recent = historicalMonths.slice(-6);
    const n = recent.length;
    const xMean = (n - 1) / 2;
    const yMean = recent.reduce((s, m) => s + m.revenue, 0) / n;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (recent[i].revenue - yMean);
      denominator += (i - xMean) ** 2;
    }
    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;

    const forecast: { month: string; revenue: number; confidence: "high" | "medium" | "low" }[] = [];
    for (let i = 1; i <= months; i++) {
      const forecastMonth = addMonths(now, i);
      const predicted = Math.max(0, intercept + slope * (n - 1 + i));

      const sameMonthLastYear = historicalMonths.find(
        (m) => m.month === format(subMonths(forecastMonth, 12), "yyyy-MM")
      );
      let adjusted = predicted;
      if (sameMonthLastYear && sameMonthLastYear.revenue > 0 && yMean > 0) {
        const seasonalFactor = sameMonthLastYear.revenue / yMean;
        adjusted = predicted * (0.7 + 0.3 * seasonalFactor);
      }

      forecast.push({
        month: format(forecastMonth, "yyyy-MM"),
        revenue: Math.round(adjusted),
        confidence: i <= 1 ? "high" : i <= 2 ? "medium" : "low",
      });
    }

    // Pipeline value
    const pipelineJobs = tenantCustIds.length
      ? await db.select({ total: jobs.total }).from(jobs).where(and(inArray(jobs.status, ["Scheduled", "InProgress"]), inArray(jobs.customerId, tenantCustIds)))
      : [];
    const pipelineTotal = pipelineJobs.reduce((s, j) => s + (j.total || 0), 0);

    const activeLeads = await db.select({ id: leads.id }).from(leads).where(and(eq(leads.tenantId, tenantId), inArray(leads.status, ["New", "Contacted", "Quoted"]))).then(r => r.length);

    const avgTicket = yMean / (recent.reduce((s, m) => s + m.jobs, 0) / n || 1);

    return NextResponse.json({
      historical: historicalMonths,
      forecast,
      pipeline: {
        value: pipelineTotal,
        count: pipelineJobs.length,
      },
      activeLeads,
      trend: {
        direction: slope > 0 ? "up" : slope < 0 ? "down" : "flat",
        monthlyChange: Math.round(slope),
        avgMonthlyRevenue: Math.round(yMean),
        avgTicket: Math.round(avgTicket),
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
