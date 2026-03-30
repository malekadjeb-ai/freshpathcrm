import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy");
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy h:mm a");
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "h:mm a");
}

export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatPhone(value?: string | null): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return value;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const JOB_STATUSES = [
  "Scheduled",
  "EnRoute",
  "InProgress",
  "Completed",
  "Invoiced",
  "Paid",
  "Cancelled",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  Scheduled: "Scheduled",
  EnRoute: "En Route",
  InProgress: "In Progress",
  Completed: "Completed",
  Invoiced: "Invoiced",
  Paid: "Paid",
  Cancelled: "Cancelled",
};

export const JOB_STATUS_COLORS: Record<JobStatus, string> = {
  Scheduled: "bg-blue-100 text-blue-800",
  EnRoute: "bg-cyan-100 text-cyan-800",
  InProgress: "bg-amber-100 text-amber-800",
  Completed: "bg-emerald-100 text-emerald-800",
  Invoiced: "bg-purple-100 text-purple-800",
  Paid: "bg-green-100 text-green-800",
  Cancelled: "bg-red-100 text-red-800",
};

export const INVOICE_STATUSES = ["Draft", "Sent", "Paid", "Overdue", "Cancelled"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  Draft: "bg-slate-100 text-slate-800",
  Sent: "bg-blue-100 text-blue-800",
  Paid: "bg-emerald-100 text-emerald-800",
  Overdue: "bg-red-100 text-red-800",
  Cancelled: "bg-red-50 text-red-600",
};

export const LOCATIONS = ["Richmond", "Katy", "SugarLand", "Other"] as const;
export type Location = (typeof LOCATIONS)[number];

export const LOCATION_LABELS: Record<Location, string> = {
  Richmond: "Richmond",
  Katy: "Katy",
  SugarLand: "Sugar Land",
  Other: "Other",
};

export const VEHICLE_TYPES = [
  "Sedan",
  "SUV",
  "Truck",
  "Van",
  "Luxury",
] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

/** Fetch JSON with automatic error handling for React Query */
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export const PAYMENT_METHODS = [
  "Cash",
  "Venmo",
  "Zelle",
  "Card",
  "Check",
  "Other",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
