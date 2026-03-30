import { z } from "zod";

export const reviewSchema = z.object({
  customerId: z.string().min(1),
  jobId: z.string().optional().nullable(),
  platform: z.enum(["google", "yelp", "facebook", "nextdoor"]).optional(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  content: z.string().optional().nullable(),
});
