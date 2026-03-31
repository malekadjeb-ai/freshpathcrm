import { describe, it, expect } from "vitest";
import {
  JOB_STATUS_STYLES,
  JOB_STATUS_DOT_COLORS,
  LEAD_STATUS_STYLES,
  PRIORITY_STYLES,
  INVOICE_STATUS_STYLES,
  REVIEW_STATUS_STYLES,
  CHART_COLORS,
} from "@/lib/ui-constants";

describe("UI Constants", () => {
  it("has styles for all job statuses", () => {
    const statuses = ["Scheduled", "EnRoute", "InProgress", "Completed", "Invoiced", "Paid", "Cancelled"];
    for (const status of statuses) {
      expect(JOB_STATUS_STYLES[status as keyof typeof JOB_STATUS_STYLES]).toBeDefined();
      expect(JOB_STATUS_DOT_COLORS[status]).toBeDefined();
    }
  });

  it("has styles for all lead statuses", () => {
    const statuses = ["New", "Contacted", "Quoted", "Booked", "Lost"];
    for (const status of statuses) {
      expect(LEAD_STATUS_STYLES[status]).toBeDefined();
    }
  });

  it("has styles for all priority levels", () => {
    const priorities = ["low", "medium", "high", "urgent"];
    for (const p of priorities) {
      expect(PRIORITY_STYLES[p]).toBeDefined();
    }
  });

  it("has styles for all invoice statuses", () => {
    const statuses = ["Draft", "Sent", "Overdue", "Paid", "Cancelled"];
    for (const status of statuses) {
      expect(INVOICE_STATUS_STYLES[status as keyof typeof INVOICE_STATUS_STYLES]).toBeDefined();
    }
  });

  it("has styles for all review statuses", () => {
    const statuses = ["pending", "sent", "clicked", "reviewed", "declined"];
    for (const status of statuses) {
      expect(REVIEW_STATUS_STYLES[status]).toBeDefined();
    }
  });

  it("has 8 chart colors", () => {
    expect(CHART_COLORS).toHaveLength(8);
    for (const color of CHART_COLORS) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("all status styles have bg and text classes", () => {
    const allMaps = [JOB_STATUS_STYLES, LEAD_STATUS_STYLES, PRIORITY_STYLES, INVOICE_STATUS_STYLES, REVIEW_STATUS_STYLES];
    for (const map of allMaps) {
      for (const value of Object.values(map)) {
        expect(value).toMatch(/bg-/);
        expect(value).toMatch(/text-/);
      }
    }
  });
});
