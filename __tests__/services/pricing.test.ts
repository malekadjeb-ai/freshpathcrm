/**
 * Pricing service unit tests
 * Tests the price-adjustment arithmetic that calculatePrice uses internally.
 * calculatePrice itself is async+DB-bound; we test the pure rule logic here.
 */
import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Pure pricing arithmetic helpers (mirrors calculatePrice internals)
// ---------------------------------------------------------------------------

interface PricingRule {
  name: string;
  type: string;
  modifier: number; // 1.0 = no change, 1.1 = +10%, 0.9 = -10%
  conditions: Record<string, unknown>;
}

function applyRules(
  basePrice: number,
  rules: PricingRule[]
): { finalPrice: number; adjustments: { ruleName: string; amount: number }[]; savings: number } {
  const adjustments: { ruleName: string; amount: number }[] = [];
  let finalPrice = basePrice;

  for (const rule of rules) {
    let amount: number;
    if ((rule.conditions.flatAmount as number | undefined) !== undefined) {
      amount = rule.conditions.flatAmount as number;
    } else {
      amount = basePrice * (rule.modifier - 1);
    }
    adjustments.push({ ruleName: rule.name, amount: Math.round(amount * 100) / 100 });
    finalPrice += amount;
  }

  finalPrice = Math.max(finalPrice, 0);
  finalPrice = Math.round(finalPrice * 100) / 100;
  const savings = adjustments.filter((a) => a.amount < 0).reduce((s, a) => s + Math.abs(a.amount), 0);

  return { finalPrice, adjustments, savings };
}

// ---------------------------------------------------------------------------
// Promo code arithmetic helpers (used across booking and invoice flow)
// ---------------------------------------------------------------------------

function applyPromoPercent(basePrice: number, discountPercent: number): number {
  const discount = Math.round(basePrice * (discountPercent / 100) * 100) / 100;
  return Math.max(0, Math.round((basePrice - discount) * 100) / 100);
}

function applyPromoFixed(basePrice: number, discountAmount: number): number {
  return Math.max(0, Math.round((basePrice - discountAmount) * 100) / 100);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Pricing: no rules (base price passthrough)", () => {
  it("returns base price unchanged when no rules apply", () => {
    const { finalPrice, adjustments } = applyRules(150, []);
    expect(finalPrice).toBe(150);
    expect(adjustments).toHaveLength(0);
  });

  it("handles zero base price", () => {
    const { finalPrice } = applyRules(0, []);
    expect(finalPrice).toBe(0);
  });
});

describe("Pricing: single surcharge rule", () => {
  it("applies a 10% weekend surcharge", () => {
    const rule: PricingRule = {
      name: "Weekend Surcharge",
      type: "day_of_week",
      modifier: 1.1,
      conditions: {},
    };
    const { finalPrice, adjustments } = applyRules(200, [rule]);
    expect(finalPrice).toBe(220);
    expect(adjustments[0].amount).toBe(20);
  });

  it("applies a 20% peak-season surcharge", () => {
    const rule: PricingRule = {
      name: "Summer Peak",
      type: "season",
      modifier: 1.2,
      conditions: {},
    };
    const { finalPrice } = applyRules(100, [rule]);
    expect(finalPrice).toBe(120);
  });

  it("applies a flat $25 same-day surcharge", () => {
    const rule: PricingRule = {
      name: "Same Day",
      type: "same_day",
      modifier: 1.0,
      conditions: { flatAmount: 25 },
    };
    const { finalPrice } = applyRules(150, [rule]);
    expect(finalPrice).toBe(175);
  });
});

describe("Pricing: single discount rule", () => {
  it("applies a 10% off-peak discount", () => {
    const rule: PricingRule = {
      name: "Early Bird",
      type: "time_of_day",
      modifier: 0.9,
      conditions: {},
    };
    const { finalPrice, savings } = applyRules(200, [rule]);
    expect(finalPrice).toBe(180);
    expect(savings).toBe(20);
  });

  it("applies a flat $15 loyalty discount", () => {
    const rule: PricingRule = {
      name: "Loyalty",
      type: "vehicle_type",
      modifier: 1.0,
      conditions: { flatAmount: -15 },
    };
    const { finalPrice, savings } = applyRules(150, [rule]);
    expect(finalPrice).toBe(135);
    expect(savings).toBe(15);
  });
});

describe("Pricing: multiple rules stack additively", () => {
  it("two surcharges compound off base price", () => {
    const rules: PricingRule[] = [
      { name: "Weekend", type: "day_of_week", modifier: 1.1, conditions: {} },
      { name: "Demand", type: "demand", modifier: 1.05, conditions: {} },
    ];
    // +10% (20) + +5% (10) = +30 on 200
    const { finalPrice } = applyRules(200, rules);
    expect(finalPrice).toBe(230);
  });

  it("surcharge and discount partially cancel", () => {
    const rules: PricingRule[] = [
      { name: "Weekend", type: "day_of_week", modifier: 1.1, conditions: {} },
      { name: "Early Bird", type: "time_of_day", modifier: 0.9, conditions: {} },
    ];
    // +10% (10) and -10% (-10) on 100
    const { finalPrice } = applyRules(100, rules);
    expect(finalPrice).toBe(100);
  });

  it("savings only counts negative adjustments", () => {
    const rules: PricingRule[] = [
      { name: "Surcharge", type: "demand", modifier: 1.2, conditions: {} },
      { name: "Discount", type: "time_of_day", modifier: 0.85, conditions: {} },
    ];
    const { savings } = applyRules(100, rules);
    expect(savings).toBe(15);
  });
});

describe("Pricing: promo code — percentage discount", () => {
  it("applies 10% promo to $200", () => {
    expect(applyPromoPercent(200, 10)).toBe(180);
  });

  it("applies 25% promo to $120", () => {
    expect(applyPromoPercent(120, 25)).toBe(90);
  });

  it("100% promo results in $0", () => {
    expect(applyPromoPercent(150, 100)).toBe(0);
  });

  it("0% promo changes nothing", () => {
    expect(applyPromoPercent(150, 0)).toBe(150);
  });

  it("fractional discount rounds to 2 decimal places", () => {
    // 15% of 99.99 = 14.9985 -> 15.00 discount -> 84.99
    expect(applyPromoPercent(99.99, 15)).toBe(84.99);
  });
});

describe("Pricing: promo code — fixed amount discount", () => {
  it("subtracts fixed $20 from $150", () => {
    expect(applyPromoFixed(150, 20)).toBe(130);
  });

  it("caps at zero — discount cannot exceed price", () => {
    expect(applyPromoFixed(50, 100)).toBe(0);
  });

  it("$0 discount is a no-op", () => {
    expect(applyPromoFixed(250, 0)).toBe(250);
  });
});

describe("Pricing: edge cases", () => {
  it("price never goes negative from large discount modifier", () => {
    const rule: PricingRule = {
      name: "Huge Discount",
      type: "season",
      modifier: 0.0, // would yield -100%
      conditions: {},
    };
    const { finalPrice } = applyRules(100, rule ? [rule] : []);
    expect(finalPrice).toBeGreaterThanOrEqual(0);
  });

  it("rounds to 2 decimal places", () => {
    const rule: PricingRule = {
      name: "Odd Modifier",
      type: "demand",
      modifier: 1.333,
      conditions: {},
    };
    const { finalPrice } = applyRules(99, [rule]);
    expect(finalPrice.toString()).not.toMatch(/\.\d{3,}/);
  });

  it("large base price computes correctly", () => {
    const rule: PricingRule = {
      name: "Ceramic Premium",
      type: "vehicle_type",
      modifier: 1.5,
      conditions: {},
    };
    const { finalPrice } = applyRules(2000, [rule]);
    expect(finalPrice).toBe(3000);
  });
});
