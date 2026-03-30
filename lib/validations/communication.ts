import { z } from "zod";

export const communicationSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  type: z.enum(["call", "sms", "email", "note", "voicemail"]),
  direction: z.enum(["inbound", "outbound", "missed"]),
  status: z.enum(["completed", "missed", "no-answer", "voicemail", "sent", "received", "logged_dev"]),
  summary: z.string().optional(),
  body: z.string().optional().nullable(),
  duration: z.number().int().min(0).optional().nullable(),
  outcome: z.string().optional().nullable(),
  channel: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  jobId: z.string().optional().nullable(),
  createdAt: z.string().optional(),
});

export type CommunicationInput = z.infer<typeof communicationSchema>;
