import { z } from "zod";

export const templateSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["sms", "email"]),
  subject: z.string().optional().nullable(),
  body: z.string().min(1),
  category: z.enum([
    "confirmation",
    "reminder_24h",
    "reminder_1h",
    "follow_up",
    "review_request",
    "rebook",
    "invoice",
    "estimate",
    "welcome",
    "custom",
  ]),
  isActive: z.boolean().optional(),
});
