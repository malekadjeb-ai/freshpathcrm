import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { subscriptions, servicePlans, customers } from "@/src/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();

    // Pre-fetch tenant customer IDs to scope subscriptions
    const tenantCustRows = await db.select({ id: customers.id }).from(customers).where(eq(customers.tenantId, tenantId));
    const tenantCustIds = tenantCustRows.map(c => c.id);

    const allSubs = tenantCustIds.length
      ? await db.select().from(subscriptions).where(inArray(subscriptions.customerId, tenantCustIds))
      : [];
    const allPlans = await db.select().from(servicePlans);
    const planMap = new Map(allPlans.map((p) => [p.id, p]));

    const subsWithPlan = allSubs.map((s) => ({
      ...s,
      plan: planMap.get(s.planId),
    }));

    const active = subsWithPlan.filter((s) => s.status === "active");
    const paused = subsWithPlan.filter((s) => s.status === "paused");
    const cancelled = subsWithPlan.filter((s) => s.status === "cancelled");

    const mrr = active.reduce((sum, s) => sum + (s.plan?.monthlyPrice ?? 0), 0);

    // Plan distribution
    const planCounts: Record<string, number> = {};
    for (const sub of active) {
      const planName = sub.plan?.name ?? "Unknown";
      planCounts[planName] = (planCounts[planName] || 0) + 1;
    }

    // Churn rate (cancelled this month / active at start of month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const cancelledThisMonth = cancelled.filter(
      (s) => s.cancelledAt && new Date(s.cancelledAt) >= startOfMonth
    ).length;
    const churnRate = active.length + cancelledThisMonth > 0
      ? (cancelledThisMonth / (active.length + cancelledThisMonth)) * 100
      : 0;

    return NextResponse.json({
      activeCount: active.length,
      pausedCount: paused.length,
      cancelledCount: cancelled.length,
      mrr,
      churnRate: Math.round(churnRate * 10) / 10,
      planDistribution: planCounts,
    });
  } catch (error) {
    console.error("Subscription stats error:", error);
    return NextResponse.json({ error: "Failed to get stats" }, { status: 500 });
  }
}
