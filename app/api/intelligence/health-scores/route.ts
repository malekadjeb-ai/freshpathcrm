import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { customers, jobs, referrals, reviews } from "@/src/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { subDays } from "date-fns";

function calculateHealthScore(customerData: {
  jobs: { createdAt: string; total: number; status: string }[];
  referralsMade: { id: string }[];
  reviews: { rating: number | null }[];
  createdAt: string;
}) {
  let score = 0;
  const now = new Date();
  const completedJobs = customerData.jobs.filter((j) => j.status === "Completed" || j.status === "Paid");

  if (completedJobs.length > 0) {
    const lastJob = completedJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    const daysSince = Math.floor((now.getTime() - new Date(lastJob.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince <= 30) score += 30;
    else if (daysSince <= 60) score += 22;
    else if (daysSince <= 90) score += 15;
    else if (daysSince <= 180) score += 8;
    else score += 2;
  }

  const yearAgo = subDays(now, 365).toISOString();
  const recentJobs = completedJobs.filter((j) => j.createdAt > yearAgo).length;
  if (recentJobs >= 6) score += 25;
  else if (recentJobs >= 4) score += 20;
  else if (recentJobs >= 2) score += 15;
  else if (recentJobs >= 1) score += 8;

  const totalSpend = completedJobs.reduce((sum, j) => sum + j.total, 0);
  if (totalSpend >= 2000) score += 20;
  else if (totalSpend >= 1000) score += 15;
  else if (totalSpend >= 500) score += 10;
  else if (totalSpend >= 200) score += 5;

  const referralCount = customerData.referralsMade.length;
  if (referralCount >= 3) score += 15;
  else if (referralCount >= 2) score += 12;
  else if (referralCount >= 1) score += 8;

  const ratedReviews = customerData.reviews.filter((r) => r.rating != null);
  const avgRating = ratedReviews.length > 0
    ? ratedReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / ratedReviews.length
    : 0;
  if (avgRating >= 4.5) score += 10;
  else if (avgRating >= 4) score += 7;
  else if (avgRating >= 3) score += 4;

  return Math.min(100, score);
}

function getHealthLabel(score: number): string {
  if (score >= 80) return "Champion";
  if (score >= 60) return "Healthy";
  if (score >= 40) return "At Risk";
  if (score >= 20) return "Cooling";
  return "Cold";
}

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const allCustomers = await db.select().from(customers).where(and(isNull(customers.deletedAt), eq(customers.tenantId, tenantId)));

    // Batch: fetch all jobs, referrals, and reviews for all customers
    const allCustIds = allCustomers.map(c => c.id);
    const [allCustJobs, allCustReferrals, allCustReviews] = await Promise.all([
      allCustIds.length ? db.select({ customerId: jobs.customerId, createdAt: jobs.createdAt, total: jobs.total, status: jobs.status }).from(jobs).where(inArray(jobs.customerId, allCustIds)) : Promise.resolve([]),
      allCustIds.length ? db.select({ referrerId: referrals.referrerId, id: referrals.id }).from(referrals).where(inArray(referrals.referrerId, allCustIds)) : Promise.resolve([]),
      allCustIds.length ? db.select({ customerId: reviews.customerId, rating: reviews.rating }).from(reviews).where(inArray(reviews.customerId, allCustIds)) : Promise.resolve([]),
    ]);

    const custJobsMap = new Map<string, { createdAt: string; total: number; status: string }[]>();
    for (const j of allCustJobs) {
      if (!custJobsMap.has(j.customerId)) custJobsMap.set(j.customerId, []);
      custJobsMap.get(j.customerId)!.push({ createdAt: j.createdAt, total: j.total, status: j.status });
    }
    const custRefMap = new Map<string, { id: string }[]>();
    for (const r of allCustReferrals) {
      if (!custRefMap.has(r.referrerId)) custRefMap.set(r.referrerId, []);
      custRefMap.get(r.referrerId)!.push({ id: r.id });
    }
    const custRevMap = new Map<string, { rating: number | null }[]>();
    for (const r of allCustReviews) {
      if (!custRevMap.has(r.customerId)) custRevMap.set(r.customerId, []);
      custRevMap.get(r.customerId)!.push({ rating: r.rating });
    }

    const scores = allCustomers.map((c) => {
      const customerJobs = custJobsMap.get(c.id) || [];
      const customerReferrals = custRefMap.get(c.id) || [];
      const customerReviews = custRevMap.get(c.id) || [];

      const score = calculateHealthScore({
        jobs: customerJobs,
        referralsMade: customerReferrals,
        reviews: customerReviews,
        createdAt: c.createdAt,
      });

      const completedJobs = customerJobs.filter((j) => j.status === "Completed" || j.status === "Paid");

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        score,
        label: getHealthLabel(score),
        jobCount: completedJobs.length,
        totalSpend: completedJobs.reduce((s, j) => s + j.total, 0),
        referralCount: customerReferrals.length,
        lastJobDate: customerJobs.length > 0
          ? customerJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt
          : null,
      };
    });

    scores.sort((a, b) => b.score - a.score);

    const segments = {
      champions: scores.filter((s) => s.label === "Champion").length,
      healthy: scores.filter((s) => s.label === "Healthy").length,
      atRisk: scores.filter((s) => s.label === "At Risk").length,
      cooling: scores.filter((s) => s.label === "Cooling").length,
      cold: scores.filter((s) => s.label === "Cold").length,
    };

    return NextResponse.json({
      scores,
      segments,
      avgScore: scores.length > 0 ? Math.round(scores.reduce((s, c) => s + c.score, 0) / scores.length) : 0,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
