export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  secret: string | null;
  description: string | null;
  isActive: boolean;
  lastFired: string | null;
  failCount: number;
  logCount: number;
  createdAt: string;
}

export interface WebhookLog {
  id: string;
  event: string;
  statusCode: number | null;
  success: boolean;
  duration: number | null;
  error: string | null;
  createdAt: string;
  payload: string;
  response: string | null;
}

export const EVENT_CATEGORIES: Record<string, string[]> = {
  Jobs: ["job.created", "job.updated", "job.completed", "job.cancelled"],
  Customers: ["customer.created", "customer.updated"],
  Invoices: ["invoice.created", "invoice.paid"],
  Leads: ["lead.created", "lead.converted"],
  Payments: ["payment.received"],
  Estimates: ["estimate.created", "estimate.accepted"],
};
