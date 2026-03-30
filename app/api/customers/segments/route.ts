import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { eq, and, isNull, count } from "drizzle-orm";
import { customers, jobs } from "@/src/db/schema";

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();

    const customerRows = await db
      .select({
        id: customers.id,
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
        lifecycleStage: customers.lifecycleStage,
        healthScore: customers.healthScore,
        lastJobAt: customers.lastJobAt,
        lastContactedAt: customers.lastContactedAt,
        createdAt: customers.createdAt,
        referredById: customers.referredById,
      })
      .from(customers)
      .where(and(isNull(customers.deletedAt), eq(customers.tenantId, tenantId)));

    // Fetch job counts per customer (non-deleted jobs)
    const jobCounts = await db
      .select({ customerId: jobs.customerId, count: count() })
      .from(jobs)
      .where(isNull(jobs.deletedAt))
      .groupBy(jobs.customerId);

    const jobCountMap: Record<string, number> = {};
    for (const row of jobCounts) {
      jobCountMap[row.customerId] = row.count;
    }

    // Fetch referral counts per customer (scoped to tenant)
    const referralCounts = await db
      .select({ referredById: customers.referredById, count: count() })
      .from(customers)
      .where(and(isNull(customers.deletedAt), eq(customers.tenantId, tenantId)))
      .groupBy(customers.referredById);

    const referralCountMap: Record<string, number> = {};
    for (const row of referralCounts) {
      if (row.referredById) {
        referralCountMap[row.referredById] = row.count;
      }
    }

    // Calculate segment counts
    const segments = {
      new: 0,
      prospect: 0,
      active: 0,
      loyal: 0,
      "at-risk": 0,
      inactive: 0,
      lost: 0,
    };

    const healthDistribution = {
      excellent: 0,
      good: 0,
      fair: 0,
      "at-risk": 0,
      lost: 0,
    };

    for (const c of customerRows) {
      const stage = c.lifecycleStage as keyof typeof segments;
      if (stage in segments) segments[stage]++;

      if (c.healthScore !== null) {
        if (c.healthScore >= 75) healthDistribution.excellent++;
        else if (c.healthScore >= 55) healthDistribution.good++;
        else if (c.healthScore >= 35) healthDistribution.fair++;
        else if (c.healthScore >= 15) healthDistribution["at-risk"]++;
        else healthDistribution.lost++;
      }
    }

    return NextResponse.json({
      totalCustomers: customerRows.length,
      segments,
      healthDistribution,
      customers: customerRows.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        lifecycleStage: c.lifecycleStage,
        healthScore: c.healthScore,
        lastJobAt: c.lastJobAt,
        lastContactedAt: c.lastContactedAt,
        createdAt: c.createdAt,
        jobCount: jobCountMap[c.id] ?? 0,
        referralCount: referralCountMap[c.id] ?? 0,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
