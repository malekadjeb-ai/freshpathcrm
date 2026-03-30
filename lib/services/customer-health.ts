import { getDbAsync } from "@/src/db";
import { customers, jobs, reviews } from "@/src/db/schema";
import { eq, isNull, gt, and } from "drizzle-orm";
import { differenceInDays } from "date-fns";

export interface HealthScoreBreakdown {
  score: number; // 0-100
  label: "excellent" | "good" | "fair" | "at-risk" | "lost";
  factors: {
    recency: number;     // 0-30 points
    frequency: number;   // 0-25 points
    monetary: number;    // 0-20 points
    engagement: number;  // 0-15 points
    loyalty: number;     // 0-10 points
  };
}

export function calculateHealthScore(data: {
  lastJobAt: Date | null;
  jobCount: number;
  totalSpent: number;
  lastContactedAt: Date | null;
  referralCount: number;
  reviewCount: number;
  createdAt: Date;
  avgTicketBenchmark: number;
}): HealthScoreBreakdown {
  const now = new Date();

  // Recency (0-30): How recently they had a job
  let recency = 0;
  if (data.lastJobAt) {
    const daysSinceLastJob = differenceInDays(now, data.lastJobAt);
    if (daysSinceLastJob <= 30) recency = 30;
    else if (daysSinceLastJob <= 60) recency = 25;
    else if (daysSinceLastJob <= 90) recency = 20;
    else if (daysSinceLastJob <= 120) recency = 15;
    else if (daysSinceLastJob <= 180) recency = 10;
    else if (daysSinceLastJob <= 365) recency = 5;
    else recency = 0;
  }

  // Frequency (0-25): Number of jobs over customer lifetime
  let frequency = 0;
  if (data.jobCount >= 10) frequency = 25;
  else if (data.jobCount >= 6) frequency = 20;
  else if (data.jobCount >= 4) frequency = 15;
  else if (data.jobCount >= 2) frequency = 10;
  else if (data.jobCount >= 1) frequency = 5;

  // Monetary (0-20): Total spend relative to benchmark
  let monetary = 0;
  const benchmark = data.avgTicketBenchmark || 150;
  const spendRatio = data.totalSpent / benchmark;
  if (spendRatio >= 10) monetary = 20;
  else if (spendRatio >= 5) monetary = 15;
  else if (spendRatio >= 3) monetary = 12;
  else if (spendRatio >= 1.5) monetary = 8;
  else if (spendRatio >= 0.5) monetary = 4;

  // Engagement (0-15): Recent contact + reviews
  let engagement = 0;
  if (data.lastContactedAt) {
    const daysSinceContact = differenceInDays(now, data.lastContactedAt);
    if (daysSinceContact <= 30) engagement += 10;
    else if (daysSinceContact <= 90) engagement += 6;
    else if (daysSinceContact <= 180) engagement += 3;
  }
  if (data.reviewCount > 0) engagement += 5;
  engagement = Math.min(engagement, 15);

  // Loyalty (0-10): Referrals + tenure
  let loyalty = 0;
  if (data.referralCount >= 3) loyalty += 5;
  else if (data.referralCount >= 1) loyalty += 3;
  const tenureDays = differenceInDays(now, data.createdAt);
  if (tenureDays >= 365) loyalty += 5;
  else if (tenureDays >= 180) loyalty += 3;
  else if (tenureDays >= 90) loyalty += 1;
  loyalty = Math.min(loyalty, 10);

  const score = recency + frequency + monetary + engagement + loyalty;

  let label: HealthScoreBreakdown["label"];
  if (score >= 75) label = "excellent";
  else if (score >= 55) label = "good";
  else if (score >= 35) label = "fair";
  else if (score >= 15) label = "at-risk";
  else label = "lost";

  return {
    score,
    label,
    factors: { recency, frequency, monetary, engagement, loyalty },
  };
}

export function deriveLifecycleStage(data: {
  jobCount: number;
  lastJobAt: Date | null;
  createdAt: Date;
  totalSpent: number;
}): string {
  const now = new Date();
  const daysSinceCreated = differenceInDays(now, data.createdAt);

  if (data.jobCount === 0) {
    return daysSinceCreated <= 30 ? "new" : "prospect";
  }

  const daysSinceLastJob = data.lastJobAt
    ? differenceInDays(now, data.lastJobAt)
    : 999;

  if (daysSinceLastJob > 365) return "lost";
  if (daysSinceLastJob > 180) return "at-risk";
  if (data.jobCount >= 3 && daysSinceLastJob <= 180) return "loyal";
  if (data.jobCount >= 1 && daysSinceLastJob <= 90) return "active";

  return "inactive";
}

export async function recalculateHealthScore(customerId: string) {
  const db = await getDbAsync();

  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
  if (!customer) return null;

  // Get jobs for this customer
  const customerJobs = await db
    .select({ total: jobs.total, scheduledAt: jobs.scheduledAt })
    .from(jobs)
    .where(and(eq(jobs.customerId, customerId), isNull(jobs.deletedAt)));

  // Get referrals (customers referred by this customer)
  const referrals = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.referredById, customerId));

  // Get reviews for this customer
  const customerReviews = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(eq(reviews.customerId, customerId));

  // Get avg ticket benchmark across all customers
  const allJobs = await db
    .select({ total: jobs.total })
    .from(jobs)
    .where(and(isNull(jobs.deletedAt), gt(jobs.total, 0)));

  const avgTicket = allJobs.length > 0
    ? allJobs.reduce((s, j) => s + j.total, 0) / allJobs.length
    : 150;

  const totalSpent = customerJobs.reduce((sum, j) => sum + j.total, 0);
  const lastJobDate = customerJobs
    .filter((j) => j.scheduledAt)
    .sort((a, b) => new Date(b.scheduledAt!).getTime() - new Date(a.scheduledAt!).getTime())[0]?.scheduledAt;

  const healthResult = calculateHealthScore({
    lastJobAt: lastJobDate ? new Date(lastJobDate) : null,
    jobCount: customerJobs.length,
    totalSpent,
    lastContactedAt: customer.lastContactedAt ? new Date(customer.lastContactedAt) : null,
    referralCount: referrals.length,
    reviewCount: customerReviews.length,
    createdAt: new Date(customer.createdAt),
    avgTicketBenchmark: avgTicket,
  });

  const lifecycleStage = deriveLifecycleStage({
    jobCount: customerJobs.length,
    lastJobAt: lastJobDate ? new Date(lastJobDate) : null,
    createdAt: new Date(customer.createdAt),
    totalSpent,
  });

  await db.update(customers).set({
    healthScore: healthResult.score,
    lifecycleStage,
    lastJobAt: lastJobDate ?? null,
    updatedAt: new Date().toISOString(),
  }).where(eq(customers.id, customerId));

  return { healthScore: healthResult.score, lifecycleStage, breakdown: healthResult };
}

export async function recalculateAllHealthScores() {
  const db = await getDbAsync();

  const allCustomers = await db
    .select({ id: customers.id })
    .from(customers)
    .where(isNull(customers.deletedAt));

  const results = [];
  for (const c of allCustomers) {
    const result = await recalculateHealthScore(c.id);
    if (result) results.push({ customerId: c.id, ...result });
  }
  return results;
}
