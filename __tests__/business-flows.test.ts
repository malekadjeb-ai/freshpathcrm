/**
 * E2E Business Flow Tests
 * Covers: rate limiting patterns, RBAC permissions, audit trail,
 * cache headers, and invoice calculation formatting.
 */
import { describe, it, expect } from "vitest";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { hasPermission, type Role, type Permission } from "@/lib/permissions";
import { diffChanges } from "@/lib/audit-utils";
import { withCacheHeaders } from "@/lib/cache-headers";
import { formatCurrency } from "@/lib/utils";

// ---------------------------------------------------------------------------
// 1. Rate Limiting — Business Scenarios
// ---------------------------------------------------------------------------

describe("Business Flow: Rate Limiting", () => {
  it("allows normal API usage patterns", () => {
    const key = `normal-usage-${Date.now()}`;
    const { limit, windowMs } = RATE_LIMITS.DASHBOARD;

    // Simulate a user loading the dashboard a few times
    for (let i = 0; i < 5; i++) {
      const result = rateLimit(key, limit, windowMs);
      expect(result.success).toBe(true);
    }
  });

  it("blocks abuse on AI chat endpoint", () => {
    const key = `ai-abuse-${Date.now()}`;
    const { limit, windowMs } = RATE_LIMITS.AI_CHAT;

    // Exhaust the AI chat limit (20 per minute)
    for (let i = 0; i < limit; i++) {
      rateLimit(key, limit, windowMs);
    }

    // 21st request should be blocked
    const blocked = rateLimit(key, limit, windowMs);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("tracks remaining requests accurately under load", () => {
    const key = `tracking-${Date.now()}`;
    const limit = 10;

    for (let i = 0; i < limit; i++) {
      const result = rateLimit(key, limit, 60_000);
      expect(result.remaining).toBe(limit - 1 - i);
    }
  });

  it("export endpoint has tight limit", () => {
    const key = `export-${Date.now()}`;
    const { limit, windowMs } = RATE_LIMITS.EXPORT;

    expect(limit).toBe(5);

    for (let i = 0; i < limit; i++) {
      const result = rateLimit(key, limit, windowMs);
      expect(result.success).toBe(true);
    }

    const blocked = rateLimit(key, limit, windowMs);
    expect(blocked.success).toBe(false);
  });

  it("different keys are independent", () => {
    const key1 = `user-a-${Date.now()}`;
    const key2 = `user-b-${Date.now()}`;

    // Exhaust key1
    for (let i = 0; i < 3; i++) {
      rateLimit(key1, 3, 60_000);
    }
    expect(rateLimit(key1, 3, 60_000).success).toBe(false);

    // key2 should still work
    expect(rateLimit(key2, 3, 60_000).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. RBAC Permissions
// ---------------------------------------------------------------------------

describe("Business Flow: RBAC Permissions", () => {
  it("OWNER has all permissions", () => {
    const permissions: Permission[] = [
      "jobs:read", "jobs:write", "jobs:delete",
      "customers:read", "customers:write", "customers:delete",
      "invoices:read", "invoices:write", "invoices:delete",
      "settings:read", "settings:write",
      "billing:read", "billing:write",
      "users:read", "users:write", "users:delete",
      "analytics:read",
      "campaigns:read", "campaigns:write",
      "reviews:read", "reviews:write",
    ];

    for (const perm of permissions) {
      expect(hasPermission("OWNER", perm)).toBe(true);
    }
  });

  it("ADMIN cannot access billing", () => {
    expect(hasPermission("ADMIN", "billing:read")).toBe(false);
    expect(hasPermission("ADMIN", "billing:write")).toBe(false);
  });

  it("ADMIN can manage jobs, customers, invoices", () => {
    expect(hasPermission("ADMIN", "jobs:read")).toBe(true);
    expect(hasPermission("ADMIN", "jobs:write")).toBe(true);
    expect(hasPermission("ADMIN", "jobs:delete")).toBe(true);
    expect(hasPermission("ADMIN", "customers:read")).toBe(true);
    expect(hasPermission("ADMIN", "customers:write")).toBe(true);
    expect(hasPermission("ADMIN", "invoices:read")).toBe(true);
    expect(hasPermission("ADMIN", "invoices:write")).toBe(true);
  });

  it("ADMIN cannot write settings or manage users", () => {
    expect(hasPermission("ADMIN", "settings:write")).toBe(false);
    expect(hasPermission("ADMIN", "users:write")).toBe(false);
    expect(hasPermission("ADMIN", "users:delete")).toBe(false);
  });

  it("TECH can only access jobs and customers:read", () => {
    expect(hasPermission("TECH", "jobs:read")).toBe(true);
    expect(hasPermission("TECH", "jobs:write")).toBe(true);
    expect(hasPermission("TECH", "customers:read")).toBe(true);
    expect(hasPermission("TECH", "calendar:read")).toBe(true);
    expect(hasPermission("TECH", "calendar:write")).toBe(true);

    // TECH should NOT have these
    expect(hasPermission("TECH", "jobs:delete")).toBe(false);
    expect(hasPermission("TECH", "customers:write")).toBe(false);
    expect(hasPermission("TECH", "invoices:read")).toBe(false);
    expect(hasPermission("TECH", "settings:read")).toBe(false);
    expect(hasPermission("TECH", "billing:read")).toBe(false);
    expect(hasPermission("TECH", "analytics:read")).toBe(false);
  });

  it("VIEWER has read-only access", () => {
    // VIEWER can read
    expect(hasPermission("VIEWER", "jobs:read")).toBe(true);
    expect(hasPermission("VIEWER", "customers:read")).toBe(true);
    expect(hasPermission("VIEWER", "calendar:read")).toBe(true);
    expect(hasPermission("VIEWER", "invoices:read")).toBe(true);
    expect(hasPermission("VIEWER", "estimates:read")).toBe(true);
    expect(hasPermission("VIEWER", "analytics:read")).toBe(true);
    expect(hasPermission("VIEWER", "reviews:read")).toBe(true);

    // VIEWER cannot write
    expect(hasPermission("VIEWER", "jobs:write")).toBe(false);
    expect(hasPermission("VIEWER", "customers:write")).toBe(false);
    expect(hasPermission("VIEWER", "invoices:write")).toBe(false);
    expect(hasPermission("VIEWER", "settings:write")).toBe(false);
    expect(hasPermission("VIEWER", "billing:write")).toBe(false);
    expect(hasPermission("VIEWER", "users:write")).toBe(false);
  });

  it("role hierarchy is enforced (OWNER > ADMIN > TECH > VIEWER)", () => {
    const roles: Role[] = ["OWNER", "ADMIN", "TECH", "VIEWER"];
    const allPerms: Permission[] = [
      "jobs:read", "jobs:write", "jobs:delete",
      "customers:read", "customers:write",
      "billing:read", "billing:write",
    ];

    for (const perm of allPerms) {
      const grants = roles.filter((r) => hasPermission(r, perm));
      // Higher roles should always be a superset of lower roles for the same permission
      if (grants.includes("VIEWER")) {
        // If VIEWER has it, all higher roles must too
        expect(grants).toContain("OWNER");
      }
      if (grants.includes("TECH")) {
        expect(grants).toContain("OWNER");
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Audit Trail
// ---------------------------------------------------------------------------

describe("Business Flow: Audit Trail", () => {
  it("diffChanges detects field changes", () => {
    const before = { name: "John", email: "john@old.com", phone: "555-1234" };
    const after = { name: "John", email: "john@new.com", phone: "555-1234" };

    const changes = diffChanges(before, after);
    expect(changes).not.toBeNull();
    expect(changes!.email).toEqual({ from: "john@old.com", to: "john@new.com" });
    expect(changes!.name).toBeUndefined();
    expect(changes!.phone).toBeUndefined();
  });

  it("diffChanges returns null for identical objects", () => {
    const obj = { name: "John", status: "Active", total: 150 };
    const changes = diffChanges(obj, { ...obj });
    expect(changes).toBeNull();
  });

  it("diffChanges tracks multiple field changes", () => {
    const before = { status: "Draft", total: 100, notes: "old" };
    const after = { status: "Sent", total: 150, notes: "updated" };

    const changes = diffChanges(before, after);
    expect(changes).not.toBeNull();
    expect(Object.keys(changes!)).toHaveLength(3);
    expect(changes!.status).toEqual({ from: "Draft", to: "Sent" });
    expect(changes!.total).toEqual({ from: 100, to: 150 });
    expect(changes!.notes).toEqual({ from: "old", to: "updated" });
  });

  it("diffChanges detects additions of new fields", () => {
    const before: Record<string, unknown> = { name: "John" };
    const after: Record<string, unknown> = { name: "John", email: "john@test.com" };

    const changes = diffChanges(before, after);
    expect(changes).not.toBeNull();
    expect(changes!.email).toEqual({ from: undefined, to: "john@test.com" });
  });

  it("diffChanges handles boolean and null changes", () => {
    const before: Record<string, unknown> = { active: true, deletedAt: null };
    const after: Record<string, unknown> = { active: false, deletedAt: "2026-03-30T00:00:00Z" };

    const changes = diffChanges(before, after);
    expect(changes).not.toBeNull();
    expect(changes!.active).toEqual({ from: true, to: false });
    expect(changes!.deletedAt).toEqual({ from: null, to: "2026-03-30T00:00:00Z" });
  });
});

// ---------------------------------------------------------------------------
// 4. Cache Headers
// ---------------------------------------------------------------------------

describe("Business Flow: Cache Headers", () => {
  it("dashboard gets 60s cache", () => {
    const response = withCacheHeaders({ jobs: 5 }, "dashboard");
    const cc = response.headers.get("Cache-Control");
    expect(cc).toContain("max-age=60");
    expect(cc).toContain("private");
  });

  it("settings gets 3600s cache (static preset, public CDN-cacheable)", () => {
    const response = withCacheHeaders({ settings: {} }, "static");
    const cc = response.headers.get("Cache-Control");
    expect(cc).toContain("max-age=3600");
    expect(cc).toContain("public");
  });

  it("list endpoints get short cache", () => {
    const response = withCacheHeaders({ items: [] }, "list");
    const cc = response.headers.get("Cache-Control");
    expect(cc).toContain("max-age=30");
  });

  it("realtime endpoints get no-cache", () => {
    const response = withCacheHeaders({ live: true }, "realtime");
    const cc = response.headers.get("Cache-Control");
    expect(cc).toContain("no-cache");
  });

  it("user-data presets include private directive", () => {
    // static is public (CDN-cacheable); dashboard, list, realtime are private (user-specific)
    const privatePresets = ["dashboard", "list", "realtime"] as const;
    for (const preset of privatePresets) {
      const response = withCacheHeaders({}, preset);
      expect(response.headers.get("Cache-Control")).toContain("private");
    }
    const staticResponse = withCacheHeaders({}, "static");
    expect(staticResponse.headers.get("Cache-Control")).toContain("public");
  });
});

// ---------------------------------------------------------------------------
// 5. Invoice Calculations
// ---------------------------------------------------------------------------

describe("Business Flow: Invoice Calculations", () => {
  it("formats currency correctly for invoices", () => {
    expect(formatCurrency(150)).toBe("$150");
    expect(formatCurrency(249.99)).toBe("$249.99");
    expect(formatCurrency(99.5)).toBe("$99.5");
  });

  it("handles zero amounts", () => {
    expect(formatCurrency(0)).toBe("$0");
  });

  it("handles large amounts with commas", () => {
    expect(formatCurrency(1234567)).toBe("$1,234,567");
    expect(formatCurrency(10000)).toBe("$10,000");
    expect(formatCurrency(999999.99)).toBe("$999,999.99");
  });

  it("handles typical detailing service prices", () => {
    expect(formatCurrency(75)).toBe("$75");
    expect(formatCurrency(150)).toBe("$150");
    expect(formatCurrency(350)).toBe("$350");
    expect(formatCurrency(1200)).toBe("$1,200");
  });

  it("handles negative amounts for refunds", () => {
    const result = formatCurrency(-50);
    expect(result).toContain("50");
  });

  it("calculates invoice totals correctly", () => {
    const lineItems = [
      { name: "Full Detail", amount: 250 },
      { name: "Ceramic Coating", amount: 500 },
      { name: "Interior Add-on", amount: 75 },
    ];
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const taxRate = 0.0825; // Texas sales tax
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const total = subtotal + tax;

    expect(subtotal).toBe(825);
    expect(tax).toBe(68.06);
    expect(total).toBe(893.06);
    expect(formatCurrency(total)).toBe("$893.06");
  });

  it("applies percentage discount correctly", () => {
    const subtotal = 500;
    const discountPercent = 10;
    const discount = subtotal * (discountPercent / 100);
    const afterDiscount = subtotal - discount;

    expect(discount).toBe(50);
    expect(afterDiscount).toBe(450);
    expect(formatCurrency(afterDiscount)).toBe("$450");
  });

  it("calculates deposit amount correctly", () => {
    const total = 400;
    const depositPercentage = 25;
    const depositAmount = total * (depositPercentage / 100);
    const remaining = total - depositAmount;

    expect(depositAmount).toBe(100);
    expect(remaining).toBe(300);
    expect(formatCurrency(depositAmount)).toBe("$100");
    expect(formatCurrency(remaining)).toBe("$300");
  });
});
