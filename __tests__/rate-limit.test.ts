import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    // Rate limiter uses internal Map — each test gets fresh state via unique keys
  });

  it("allows requests under the limit", () => {
    const key = `test-allow-${Date.now()}`;
    const result = rateLimit(key, 5, 60_000);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("blocks requests over the limit", () => {
    const key = `test-block-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      rateLimit(key, 3, 60_000);
    }
    const result = rateLimit(key, 3, 60_000);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets after window expires", () => {
    const key = `test-reset-${Date.now()}`;
    // Use a 1ms window so it expires immediately
    rateLimit(key, 1, 1);

    // Wait for window to expire
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const result = rateLimit(key, 1, 60_000);
        expect(result.success).toBe(true);
        resolve();
      }, 10);
    });
  });

  it("tracks remaining count correctly", () => {
    const key = `test-remaining-${Date.now()}`;
    const r1 = rateLimit(key, 5, 60_000);
    expect(r1.remaining).toBe(4);

    const r2 = rateLimit(key, 5, 60_000);
    expect(r2.remaining).toBe(3);

    const r3 = rateLimit(key, 5, 60_000);
    expect(r3.remaining).toBe(2);
  });

  it("returns resetAt timestamp", () => {
    const key = `test-reset-at-${Date.now()}`;
    const before = Date.now();
    const result = rateLimit(key, 5, 60_000);
    expect(result.resetAt).toBeGreaterThanOrEqual(before + 60_000);
  });
});
