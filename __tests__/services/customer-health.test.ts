/**
 * Customer health score unit tests
 * calculateHealthScore and deriveLifecycleStage are pure functions — no DB required.
 */
import { describe, it, expect, vi } from "vitest";

// customer-health.ts imports @/src/db which uses React cache() not available in Vitest.
// Mock the module before importing so the pure-function exports resolve cleanly.
vi.mock("@/src/db", () => ({
  getDb: vi.fn(),
  getDbAsync: vi.fn(),
}));

import { calculateHealthScore, deriveLifecycleStage } from "@/lib/services/customer-health";
import { subDays, subMonths, subYears } from "date-fns";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BENCHMARK = 150;

function makeData(overrides: Partial<Parameters<typeof calculateHealthScore>[0]> = {}) {
  return {
    lastJobAt: null,
    jobCount: 0,
    totalSpent: 0,
    lastContactedAt: null,
    referralCount: 0,
    reviewCount: 0,
    createdAt: subYears(new Date(), 1),
    avgTicketBenchmark: BENCHMARK,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Score bands
// ---------------------------------------------------------------------------

describe("calculateHealthScore: score labels", () => {
  it("excellent (>=75) for high-value loyal customer", () => {
    const data = makeData({
      lastJobAt: subDays(new Date(), 10),   // recency: 30
      jobCount: 12,                          // frequency: 25
      totalSpent: 1800,                      // spendRatio: 12 → monetary: 20
      lastContactedAt: subDays(new Date(), 5), // engagement: 10+5=15
      referralCount: 3,                      // loyalty: 5+5=10
      reviewCount: 1,
      createdAt: subYears(new Date(), 2),
    });
    const result = calculateHealthScore(data);
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.label).toBe("excellent");
  });

  it("lost (<15) for completely inactive customer", () => {
    const data = makeData({
      lastJobAt: null,
      jobCount: 0,
      totalSpent: 0,
      lastContactedAt: null,
      referralCount: 0,
      reviewCount: 0,
      createdAt: subDays(new Date(), 15), // tenure < 90d
    });
    const result = calculateHealthScore(data);
    expect(result.score).toBeLessThan(15);
    expect(result.label).toBe("lost");
  });

  it("at-risk (15-34) for stale customer with minimal activity", () => {
    const data = makeData({
      lastJobAt: subDays(new Date(), 350), // recency: 5
      jobCount: 1,                          // frequency: 5
      totalSpent: 75,                       // spendRatio: 0.5 → monetary: 4
      lastContactedAt: subDays(new Date(), 200), // engagement: 3
      referralCount: 0,
      reviewCount: 0,
      createdAt: subYears(new Date(), 2),   // loyalty tenure: +5
    });
    const result = calculateHealthScore(data);
    expect(result.score).toBeGreaterThanOrEqual(15);
    expect(result.score).toBeLessThan(35);
    expect(result.label).toBe("at-risk");
  });
});

// ---------------------------------------------------------------------------
// Individual factor scoring
// ---------------------------------------------------------------------------

describe("calculateHealthScore: recency factor (0-30)", () => {
  it("30 points for job within last 30 days", () => {
    const result = calculateHealthScore(makeData({ lastJobAt: subDays(new Date(), 5) }));
    expect(result.factors.recency).toBe(30);
  });

  it("25 points for job 31-60 days ago", () => {
    const result = calculateHealthScore(makeData({ lastJobAt: subDays(new Date(), 45) }));
    expect(result.factors.recency).toBe(25);
  });

  it("20 points for job 61-90 days ago", () => {
    const result = calculateHealthScore(makeData({ lastJobAt: subDays(new Date(), 75) }));
    expect(result.factors.recency).toBe(20);
  });

  it("15 points for job 91-120 days ago", () => {
    const result = calculateHealthScore(makeData({ lastJobAt: subDays(new Date(), 105) }));
    expect(result.factors.recency).toBe(15);
  });

  it("5 points for job 181-365 days ago", () => {
    const result = calculateHealthScore(makeData({ lastJobAt: subDays(new Date(), 300) }));
    expect(result.factors.recency).toBe(5);
  });

  it("0 points for no job history", () => {
    const result = calculateHealthScore(makeData({ lastJobAt: null }));
    expect(result.factors.recency).toBe(0);
  });

  it("0 points for job over 1 year ago", () => {
    const result = calculateHealthScore(makeData({ lastJobAt: subDays(new Date(), 400) }));
    expect(result.factors.recency).toBe(0);
  });
});

describe("calculateHealthScore: frequency factor (0-25)", () => {
  it("5 points for exactly 1 job", () => {
    const result = calculateHealthScore(makeData({ jobCount: 1 }));
    expect(result.factors.frequency).toBe(5);
  });

  it("10 points for 2-3 jobs", () => {
    const result = calculateHealthScore(makeData({ jobCount: 3 }));
    expect(result.factors.frequency).toBe(10);
  });

  it("15 points for 4-5 jobs", () => {
    const result = calculateHealthScore(makeData({ jobCount: 4 }));
    expect(result.factors.frequency).toBe(15);
  });

  it("20 points for 6-9 jobs", () => {
    const result = calculateHealthScore(makeData({ jobCount: 8 }));
    expect(result.factors.frequency).toBe(20);
  });

  it("25 points for 10+ jobs", () => {
    const result = calculateHealthScore(makeData({ jobCount: 15 }));
    expect(result.factors.frequency).toBe(25);
  });

  it("0 points for no jobs", () => {
    const result = calculateHealthScore(makeData({ jobCount: 0 }));
    expect(result.factors.frequency).toBe(0);
  });
});

describe("calculateHealthScore: monetary factor (0-20)", () => {
  it("4 points for spend ratio 0.5x benchmark", () => {
    const result = calculateHealthScore(makeData({ totalSpent: 75, avgTicketBenchmark: 150 }));
    expect(result.factors.monetary).toBe(4);
  });

  it("8 points for spend ratio 1.5x benchmark", () => {
    const result = calculateHealthScore(makeData({ totalSpent: 300, avgTicketBenchmark: 150 }));
    expect(result.factors.monetary).toBe(8);
  });

  it("12 points for spend ratio 3x benchmark", () => {
    const result = calculateHealthScore(makeData({ totalSpent: 450, avgTicketBenchmark: 150 }));
    expect(result.factors.monetary).toBe(12);
  });

  it("20 points for spend ratio >=10x benchmark", () => {
    const result = calculateHealthScore(makeData({ totalSpent: 2000, avgTicketBenchmark: 150 }));
    expect(result.factors.monetary).toBe(20);
  });

  it("0 points for no spend", () => {
    const result = calculateHealthScore(makeData({ totalSpent: 0 }));
    expect(result.factors.monetary).toBe(0);
  });

  it("uses default benchmark of 150 when not provided", () => {
    const result = calculateHealthScore(makeData({ totalSpent: 1500, avgTicketBenchmark: 0 }));
    // spendRatio = 1500/150 = 10 → monetary: 20
    expect(result.factors.monetary).toBe(20);
  });
});

describe("calculateHealthScore: engagement factor (0-15, capped)", () => {
  it("adds 5 bonus points for having a review", () => {
    const withReview = calculateHealthScore(makeData({ reviewCount: 1 }));
    const withoutReview = calculateHealthScore(makeData({ reviewCount: 0 }));
    expect(withReview.factors.engagement - withoutReview.factors.engagement).toBe(5);
  });

  it("10 points for contact within 30 days", () => {
    const result = calculateHealthScore(makeData({
      lastContactedAt: subDays(new Date(), 7),
      reviewCount: 0,
    }));
    expect(result.factors.engagement).toBe(10);
  });

  it("capped at 15 even with high contact + review", () => {
    const result = calculateHealthScore(makeData({
      lastContactedAt: subDays(new Date(), 5), // +10
      reviewCount: 2,                           // +5
    }));
    expect(result.factors.engagement).toBe(15);
  });
});

describe("calculateHealthScore: loyalty factor (0-10, capped)", () => {
  it("3 points for 1-2 referrals", () => {
    const result = calculateHealthScore(makeData({
      referralCount: 1,
      createdAt: subDays(new Date(), 20), // tenure < 90d, no tenure points
    }));
    expect(result.factors.loyalty).toBe(3);
  });

  it("5 points for 3+ referrals", () => {
    const result = calculateHealthScore(makeData({
      referralCount: 4,
      createdAt: subDays(new Date(), 20),
    }));
    expect(result.factors.loyalty).toBe(5);
  });

  it("5 points for tenure >= 1 year (no referrals)", () => {
    const result = calculateHealthScore(makeData({
      referralCount: 0,
      createdAt: subYears(new Date(), 2),
    }));
    expect(result.factors.loyalty).toBe(5);
  });

  it("capped at 10 for referrals + long tenure", () => {
    const result = calculateHealthScore(makeData({
      referralCount: 5,
      createdAt: subYears(new Date(), 3),
    }));
    expect(result.factors.loyalty).toBe(10);
  });
});

describe("calculateHealthScore: total score", () => {
  it("total equals sum of all factors", () => {
    const data = makeData({
      lastJobAt: subDays(new Date(), 20),
      jobCount: 5,
      totalSpent: 600,
      lastContactedAt: subDays(new Date(), 15),
      referralCount: 1,
      reviewCount: 1,
      createdAt: subYears(new Date(), 2),
    });
    const result = calculateHealthScore(data);
    const { recency, frequency, monetary, engagement, loyalty } = result.factors;
    expect(result.score).toBe(recency + frequency + monetary + engagement + loyalty);
  });

  it("score is non-negative even for brand-new customer with no history", () => {
    const result = calculateHealthScore(makeData({ createdAt: new Date() }));
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// deriveLifecycleStage
// ---------------------------------------------------------------------------

describe("deriveLifecycleStage", () => {
  it("'new' for customer with no jobs created within 30 days", () => {
    const result = deriveLifecycleStage({
      jobCount: 0,
      lastJobAt: null,
      createdAt: subDays(new Date(), 10),
      totalSpent: 0,
    });
    expect(result).toBe("new");
  });

  it("'prospect' for customer with no jobs created more than 30 days ago", () => {
    const result = deriveLifecycleStage({
      jobCount: 0,
      lastJobAt: null,
      createdAt: subDays(new Date(), 45),
      totalSpent: 0,
    });
    expect(result).toBe("prospect");
  });

  it("'lost' when last job was over 1 year ago", () => {
    const result = deriveLifecycleStage({
      jobCount: 5,
      lastJobAt: subDays(new Date(), 400),
      createdAt: subYears(new Date(), 3),
      totalSpent: 500,
    });
    expect(result).toBe("lost");
  });

  it("'at-risk' when last job was 181-365 days ago", () => {
    const result = deriveLifecycleStage({
      jobCount: 3,
      lastJobAt: subDays(new Date(), 200),
      createdAt: subYears(new Date(), 2),
      totalSpent: 300,
    });
    expect(result).toBe("at-risk");
  });

  it("'loyal' for 3+ jobs within 180 days", () => {
    const result = deriveLifecycleStage({
      jobCount: 5,
      lastJobAt: subDays(new Date(), 30),
      createdAt: subYears(new Date(), 2),
      totalSpent: 750,
    });
    expect(result).toBe("loyal");
  });

  it("'active' for 1+ job within 90 days", () => {
    const result = deriveLifecycleStage({
      jobCount: 1,
      lastJobAt: subDays(new Date(), 45),
      createdAt: subMonths(new Date(), 6),
      totalSpent: 150,
    });
    expect(result).toBe("active");
  });
});
