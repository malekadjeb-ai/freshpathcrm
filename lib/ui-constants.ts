import type { JobStatus, InvoiceStatus } from "./utils";

// Status colors used in jobs, calendar, kanban, etc.
export const JOB_STATUS_STYLES: Record<JobStatus, string> = {
  Scheduled: "bg-blue-50 text-blue-700",
  EnRoute: "bg-cyan-50 text-cyan-700",
  InProgress: "bg-amber-50 text-amber-700",
  Completed: "bg-emerald-50 text-emerald-700",
  Invoiced: "bg-purple-50 text-purple-700",
  Paid: "bg-green-50 text-green-700",
  Cancelled: "bg-red-50 text-red-700",
};

// Solid colors for calendar events and kanban column indicators
export const JOB_STATUS_DOT_COLORS: Record<string, string> = {
  Scheduled: "bg-blue-500",
  EnRoute: "bg-cyan-500",
  InProgress: "bg-amber-500",
  Completed: "bg-emerald-500",
  Invoiced: "bg-purple-500",
  Paid: "bg-green-600",
  Cancelled: "bg-red-500",
};

export const LEAD_STATUS_STYLES: Record<string, string> = {
  New: "bg-blue-50 text-blue-600",
  Contacted: "bg-amber-50 text-amber-600",
  Quoted: "bg-purple-50 text-purple-600",
  Booked: "bg-emerald-50 text-emerald-600",
  Lost: "bg-red-50 text-red-600",
};

export const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-red-50 text-red-700",
  urgent: "bg-red-100 text-red-800",
};

export const INVOICE_STATUS_STYLES: Record<InvoiceStatus, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Sent: "bg-blue-50 text-blue-700",
  Overdue: "bg-red-50 text-red-700",
  Paid: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-slate-100 text-slate-500",
};

export const REVIEW_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  sent: "bg-blue-50 text-blue-700",
  clicked: "bg-purple-50 text-purple-700",
  reviewed: "bg-emerald-50 text-emerald-700",
  declined: "bg-red-50 text-red-700",
};

// Chart colors (for recharts in analytics)
export const CHART_COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316", "#ec4899",
];
