import { z } from "zod";

export const campaignSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  type: z.enum(["sms", "email", "both"]).default("sms"),
  subject: z.string().optional(),
  body: z.string().min(1, "Message body is required"),
  targetCriteria: z.string().default("{}"),
  scheduledAt: z.string().nullable().optional(),
});

export const updateCampaignSchema = campaignSchema.partial().extend({
  status: z
    .enum(["Draft", "Scheduled", "Sending", "Sent", "Paused", "Cancelled"])
    .optional(),
});

export type CreateCampaignInput = z.infer<typeof campaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
