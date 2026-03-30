import { z } from "zod";

export const fleetContractSchema = z.object({
  customerId: z.string().min(1),
  name: z.string().min(1, "Contract name is required"),
  frequency: z.enum(["weekly", "biweekly", "monthly", "quarterly"]).default("monthly"),
  pricePerVehicle: z.number().min(0).nullable().optional(),
  flatRate: z.number().min(0).nullable().optional(),
  vehicleCount: z.number().int().min(0).default(0),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

export type FleetContractInput = z.infer<typeof fleetContractSchema>;
