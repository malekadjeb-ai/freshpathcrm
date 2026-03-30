export type LeadSource = (typeof import("./constants").LEAD_SOURCES)[number];
export type LeadStatus = (typeof import("./constants").LEAD_STATUSES)[number];
export type LeadPriority = (typeof import("./constants").LEAD_PRIORITIES)[number];
export type EstimateStatus = (typeof import("./constants").ESTIMATE_STATUSES)[number];
export type InvoiceStatus = (typeof import("./constants").INVOICE_STATUSES)[number];
export type ActivityType = (typeof import("./constants").ACTIVITY_TYPES)[number];
export type ActivityDirection = (typeof import("./constants").ACTIVITY_DIRECTIONS)[number];

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: "FREE" | "PRO" | "GROWTH" | "ENTERPRISE";
  status: "ACTIVE" | "PAUSED" | "CANCELLED" | "TRIAL";
  billingCustomerId?: string | null;
  billingSubscriptionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name?: string | null;
  email: string;
  role: "ADMIN" | "OWNER" | "MANAGER" | "EMPLOYEE" | "USER";
  tenantId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Lead { 
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  source: LeadSource;
  status: LeadStatus;
  priority: LeadPriority;
  vehicleInfo?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EstimateItem {
  description: string;
  unitPrice: number;
  quantity: number;
  total: number;
}

export interface Estimate {
  id: string;
  number: string;
  status: EstimateStatus;
  customerId?: string | null;
  leadId?: string | null;
  items: EstimateItem[];
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  validUntil?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  type: ActivityType;
  direction?: ActivityDirection | null;
  summary: string;
  followUpDate?: string | null;
  followUpDone: boolean;
  createdAt: string;
  updatedAt: string;
}
