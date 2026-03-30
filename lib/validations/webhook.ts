import { z } from "zod";

export const WEBHOOK_EVENTS = [
  "job.created",
  "job.updated",
  "job.completed",
  "job.cancelled",
  "customer.created",
  "customer.updated",
  "invoice.created",
  "invoice.paid",
  "lead.created",
  "lead.converted",
  "payment.received",
  "estimate.created",
  "estimate.accepted",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export const webhookEndpointSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  events: z.array(z.string().min(1)).min(1, "Select at least one event"),
  secret: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type WebhookEndpointInput = z.infer<typeof webhookEndpointSchema>;
