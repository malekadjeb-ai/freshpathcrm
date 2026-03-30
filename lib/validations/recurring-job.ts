import { z } from "zod";

export const recurringJobSchema = z.object({
  customerId: z.string().min(1),
  vehicleId: z.string().optional().nullable(),
  frequency: z.enum(["weekly", "biweekly", "monthly", "quarterly"]),
  dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
  timeOfDay: z.string().optional().nullable(),
  services: z.string().min(1), // JSON string of service IDs + prices
  addOns: z.string().optional().nullable(),
  location: z.string().optional(),
  address: z.string().optional().nullable(),
  totalPrice: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  nextRunDate: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});
