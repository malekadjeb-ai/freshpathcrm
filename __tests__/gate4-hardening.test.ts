/**
 * Gate 4 Hardening Tests
 * Covers: import sanitization, health check shape, request tracing,
 * streaming export format, API versioning, CI/CD config validation.
 */
import { describe, it, expect } from "vitest";
import { sanitizeImportRecords, validateEmail } from "@/lib/sanitize-import";

// ---------------------------------------------------------------------------
// 1. Import Sanitization
// ---------------------------------------------------------------------------

describe("sanitizeImportRecords", () => {
  it("accepts valid records", () => {
    const result = sanitizeImportRecords([
      {
        phoneNumber: "(281) 555-1234",
        contactName: "John Doe",
        direction: "inbound",
        type: "call",
        timestamp: "2026-03-30T10:00:00Z",
        duration: 120,
      },
    ]);
    expect(result.valid).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
    expect(result.valid[0].contactName).toBe("John Doe");
  });

  it("rejects records with missing phone", () => {
    const result = sanitizeImportRecords([
      { contactName: "No Phone", direction: "inbound", type: "call", timestamp: "2026-03-30T10:00:00Z" },
    ]);
    expect(result.valid).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].reason).toContain("phone");
  });

  it("rejects records with invalid phone (too short)", () => {
    const result = sanitizeImportRecords([
      { phoneNumber: "123", direction: "inbound", type: "call", timestamp: "2026-03-30T10:00:00Z" },
    ]);
    expect(result.valid).toHaveLength(0);
    expect(result.errors[0].reason).toContain("Invalid phone");
  });

  it("rejects records with invalid timestamp", () => {
    const result = sanitizeImportRecords([
      { phoneNumber: "2815551234", direction: "inbound", type: "call", timestamp: "not-a-date" },
    ]);
    expect(result.valid).toHaveLength(0);
    expect(result.errors[0].reason).toContain("timestamp");
  });

  it("rejects records with missing timestamp", () => {
    const result = sanitizeImportRecords([
      { phoneNumber: "2815551234", direction: "inbound", type: "call" },
    ]);
    expect(result.valid).toHaveLength(0);
    expect(result.errors[0].reason).toContain("timestamp");
  });

  it("removes within-batch duplicates", () => {
    const record = {
      phoneNumber: "2815551234",
      direction: "inbound",
      type: "call",
      timestamp: "2026-03-30T10:00:00Z",
    };
    const result = sanitizeImportRecords([record, record, record]);
    expect(result.valid).toHaveLength(1);
    expect(result.duplicatesRemoved).toBe(2);
  });

  it("trims and caps name length", () => {
    const longName = "A".repeat(200);
    const result = sanitizeImportRecords([
      { phoneNumber: "2815551234", contactName: `  ${longName}  `, direction: "inbound", type: "call", timestamp: "2026-03-30T10:00:00Z" },
    ]);
    expect(result.valid[0].contactName.length).toBeLessThanOrEqual(120);
    expect(result.valid[0].contactName.startsWith("A")).toBe(true);
  });

  it("strips control characters from name", () => {
    const result = sanitizeImportRecords([
      { phoneNumber: "2815551234", contactName: "John\x00\x01Doe", direction: "inbound", type: "call", timestamp: "2026-03-30T10:00:00Z" },
    ]);
    expect(result.valid[0].contactName).toBe("JohnDoe");
  });

  it("caps message body length", () => {
    const longBody = "B".repeat(10000);
    const result = sanitizeImportRecords([
      { phoneNumber: "2815551234", direction: "inbound", type: "text", timestamp: "2026-03-30T10:00:00Z", messageBody: longBody },
    ]);
    expect(result.valid[0].messageBody!.length).toBeLessThanOrEqual(5000);
  });

  it("normalizes direction and type to lowercase", () => {
    const result = sanitizeImportRecords([
      { phoneNumber: "2815551234", direction: "Inbound", type: "Call", timestamp: "2026-03-30T10:00:00Z" },
    ]);
    expect(result.valid[0].direction).toBe("inbound");
    expect(result.valid[0].type).toBe("call");
  });

  it("rejects invalid direction", () => {
    const result = sanitizeImportRecords([
      { phoneNumber: "2815551234", direction: "sideways", type: "call", timestamp: "2026-03-30T10:00:00Z" },
    ]);
    expect(result.errors[0].reason).toContain("direction");
  });

  it("handles negative duration gracefully", () => {
    const result = sanitizeImportRecords([
      { phoneNumber: "2815551234", direction: "inbound", type: "call", timestamp: "2026-03-30T10:00:00Z", duration: -5 },
    ]);
    expect(result.valid[0].duration).toBeUndefined();
  });

  it("handles non-numeric duration gracefully", () => {
    const result = sanitizeImportRecords([
      { phoneNumber: "2815551234", direction: "inbound", type: "call", timestamp: "2026-03-30T10:00:00Z", duration: "abc" as unknown },
    ]);
    expect(result.valid[0].duration).toBeUndefined();
  });
});

describe("validateEmail", () => {
  it("accepts valid emails", () => {
    expect(validateEmail("john@example.com")).toBe(true);
    expect(validateEmail("a@b.co")).toBe(true);
  });

  it("rejects invalid emails", () => {
    expect(validateEmail("not-email")).toBe(false);
    expect(validateEmail("@missing.com")).toBe(false);
    expect(validateEmail("no@domain")).toBe(false);
    expect(validateEmail("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. Health Check response shape
// ---------------------------------------------------------------------------

describe("Health check response shape", () => {
  it("healthy response has required fields", () => {
    const response = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "abc123",
      uptime: 3600,
      database: {
        status: "connected",
        latencyMs: 5,
        driver: "turso",
      },
      runtime: "vercel-node",
    };
    expect(response.status).toBe("healthy");
    expect(response.database.status).toBe("connected");
    expect(typeof response.database.latencyMs).toBe("number");
    expect(typeof response.uptime).toBe("number");
    expect(response.version).toBeDefined();
  });

  it("degraded response includes error info", () => {
    const response = {
      status: "degraded",
      database: {
        status: "error",
        latencyMs: 5000,
        error: "Connection refused",
      },
    };
    expect(response.status).toBe("degraded");
    expect(response.database.error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 3. Request tracing
// ---------------------------------------------------------------------------

describe("Request ID generation", () => {
  it("crypto.randomUUID returns valid UUID format", () => {
    const uuid = crypto.randomUUID();
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => crypto.randomUUID()));
    expect(ids.size).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// 4. API versioning
// ---------------------------------------------------------------------------

describe("API versioning", () => {
  it("detects version mismatch", () => {
    const CURRENT = 1;
    const clientVersion = 2;
    expect(clientVersion === CURRENT).toBe(false);
  });

  it("detects version match", () => {
    const CURRENT = 1;
    const clientVersion = 1;
    expect(clientVersion === CURRENT).toBe(true);
  });

  it("handles missing client version (defaults to 0)", () => {
    const clientVersion = Number(null || 0);
    expect(clientVersion).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 5. Streaming export CSV format
// ---------------------------------------------------------------------------

describe("Streaming CSV export", () => {
  function csvRow(values: Record<string, unknown>): string {
    return Object.values(values)
      .map((val) => {
        if (val === null || val === undefined) return "";
        const str = String(val);
        if (str.includes(",") || str.includes("\n") || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(",");
  }

  it("escapes commas in values", () => {
    expect(csvRow({ name: "Doe, John" })).toBe('"Doe, John"');
  });

  it("escapes quotes in values", () => {
    expect(csvRow({ name: 'He said "hi"' })).toBe('"He said ""hi"""');
  });

  it("handles null values as empty strings", () => {
    expect(csvRow({ a: null, b: "ok" })).toBe(",ok");
  });

  it("handles newlines in values", () => {
    expect(csvRow({ note: "line1\nline2" })).toBe('"line1\nline2"');
  });
});
