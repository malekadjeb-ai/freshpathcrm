import { z } from "zod";

export const leadSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  source: z.enum([
    "Google",
    "Google LSA",
    "Google Voice",
    "Instagram",
    "Facebook",
    "TikTok",
    "Nextdoor",
    "Referral",
    "Website",
    "Walk-in",
    "Yelp",
    "Google Ads",
    "Door Hanger",
    "HOA",
    "Fleet",
    "Other",
  ]),
  sourceDetail: z.string().optional().nullable(),
  status: z
    .enum(["New", "Contacted", "Qualified", "Quoted", "Booked", "Won", "Lost", "Stale"])
    .optional(),
  lostReason: z
    .enum(["Price", "Timing", "No Response", "Competitor", "Not Interested", "Other"])
    .optional()
    .nullable(),
  lostNotes: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  vehicleInfo: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

export const convertLeadSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
});
