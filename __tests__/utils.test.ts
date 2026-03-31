import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatTime,
  formatPhone,
  getInitials,
  timeAgo,
  cn,
  JOB_STATUSES,
  JOB_STATUS_LABELS,
  JOB_STATUS_COLORS,
  INVOICE_STATUSES,
  INVOICE_STATUS_COLORS,
  VEHICLE_TYPES,
  LOCATIONS,
  LOCATION_LABELS,
  PAYMENT_METHODS,
} from "@/lib/utils";

describe("formatCurrency", () => {
  it("formats whole dollars", () => {
    expect(formatCurrency(100)).toBe("$100");
  });

  it("formats cents", () => {
    expect(formatCurrency(99.99)).toBe("$99.99");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0");
  });

  it("formats large numbers with commas", () => {
    expect(formatCurrency(1234567)).toBe("$1,234,567");
  });
});

describe("formatDate", () => {
  it("formats ISO string", () => {
    const result = formatDate("2026-03-15T12:00:00.000Z");
    expect(result).toBe("Mar 15, 2026");
  });

  it("formats Date object", () => {
    const result = formatDate(new Date(2026, 2, 15));
    expect(result).toBe("Mar 15, 2026");
  });
});

describe("formatPhone", () => {
  it("formats 10-digit number", () => {
    expect(formatPhone("2815551234")).toBe("(281) 555-1234");
  });

  it("formats 11-digit number with country code", () => {
    expect(formatPhone("12815551234")).toBe("+1 (281) 555-1234");
  });

  it("returns empty for null", () => {
    expect(formatPhone(null)).toBe("");
  });

  it("returns raw value for non-standard format", () => {
    expect(formatPhone("555")).toBe("555");
  });
});

describe("getInitials", () => {
  it("returns initials for two words", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });

  it("returns single initial", () => {
    expect(getInitials("John")).toBe("J");
  });

  it("handles three words", () => {
    expect(getInitials("John Michael Doe")).toBe("JM");
  });
});

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });
});

describe("timeAgo", () => {
  it("returns relative time string", () => {
    const result = timeAgo(new Date().toISOString());
    expect(result).toContain("ago");
  });
});

describe("formatDateTime", () => {
  it("includes date and 12-hour time", () => {
    const result = formatDateTime("2026-03-15T14:30:00.000Z");
    expect(result).toContain("2026");
    expect(result).toMatch(/\d+:\d{2}\s?(AM|PM)/i);
  });

  it("accepts Date objects", () => {
    const result = formatDateTime(new Date(2026, 5, 1, 9, 0, 0));
    expect(result).toContain("Jun 1, 2026");
  });
});

describe("formatTime", () => {
  it("formats to 12-hour time with AM/PM", () => {
    const result = formatTime(new Date(2026, 0, 1, 14, 30, 0));
    expect(result).toMatch(/2:30 PM/i);
  });

  it("formats midnight correctly", () => {
    const result = formatTime(new Date(2026, 0, 1, 0, 0, 0));
    expect(result).toMatch(/12:00 AM/i);
  });

  it("formats noon correctly", () => {
    const result = formatTime(new Date(2026, 0, 1, 12, 0, 0));
    expect(result).toMatch(/12:00 PM/i);
  });
});

describe("JOB_STATUSES", () => {
  it("contains the expected 7 statuses", () => {
    expect(JOB_STATUSES).toHaveLength(7);
  });

  it("includes all workflow states", () => {
    expect(JOB_STATUSES).toContain("Scheduled");
    expect(JOB_STATUSES).toContain("InProgress");
    expect(JOB_STATUSES).toContain("Completed");
    expect(JOB_STATUSES).toContain("Paid");
    expect(JOB_STATUSES).toContain("Cancelled");
  });

  it("every status has a label", () => {
    JOB_STATUSES.forEach((status) => {
      expect(JOB_STATUS_LABELS[status]).toBeDefined();
      expect(JOB_STATUS_LABELS[status].length).toBeGreaterThan(0);
    });
  });

  it("every status has a CSS color class", () => {
    JOB_STATUSES.forEach((status) => {
      expect(JOB_STATUS_COLORS[status]).toBeDefined();
      expect(JOB_STATUS_COLORS[status]).toContain("bg-");
    });
  });

  it("InProgress label is human-readable", () => {
    expect(JOB_STATUS_LABELS["InProgress"]).toBe("In Progress");
  });

  it("EnRoute label is human-readable", () => {
    expect(JOB_STATUS_LABELS["EnRoute"]).toBe("En Route");
  });
});

describe("INVOICE_STATUSES", () => {
  it("contains 5 statuses", () => {
    expect(INVOICE_STATUSES).toHaveLength(5);
  });

  it("includes Overdue status", () => {
    expect(INVOICE_STATUSES).toContain("Overdue");
  });

  it("every status has a color class", () => {
    INVOICE_STATUSES.forEach((status) => {
      expect(INVOICE_STATUS_COLORS[status]).toBeDefined();
    });
  });
});

describe("VEHICLE_TYPES", () => {
  it("contains common vehicle types", () => {
    expect(VEHICLE_TYPES).toContain("Sedan");
    expect(VEHICLE_TYPES).toContain("SUV");
    expect(VEHICLE_TYPES).toContain("Truck");
    expect(VEHICLE_TYPES).toContain("Luxury");
  });
});

describe("LOCATIONS", () => {
  it("includes all service areas", () => {
    expect(LOCATIONS).toContain("Richmond");
    expect(LOCATIONS).toContain("Katy");
    expect(LOCATIONS).toContain("SugarLand");
  });

  it("SugarLand label is human-readable", () => {
    expect(LOCATION_LABELS["SugarLand"]).toBe("Sugar Land");
  });

  it("every location has a label", () => {
    LOCATIONS.forEach((loc) => {
      expect(LOCATION_LABELS[loc]).toBeDefined();
    });
  });
});

describe("PAYMENT_METHODS", () => {
  it("includes common payment methods", () => {
    expect(PAYMENT_METHODS).toContain("Cash");
    expect(PAYMENT_METHODS).toContain("Venmo");
    expect(PAYMENT_METHODS).toContain("Zelle");
    expect(PAYMENT_METHODS).toContain("Card");
  });
});
