import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  type: z
    .enum([
      "general",
      "follow_up",
      "call_back",
      "send_estimate",
      "review_request",
      "rebook",
    ])
    .optional(),
  dueDate: z.string().optional().nullable(),
  dueTime: z.string().optional().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  customerId: z.string().optional().nullable(),
  jobId: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
  completed: z.boolean().optional(),
});
