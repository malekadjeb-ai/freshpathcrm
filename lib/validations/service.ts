import { z } from "zod";

export const serviceItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  basePrice: z.number().min(0, "Price must be non-negative"),
  supplyCost: z.number().min(0).optional(),
  category: z.enum(["Service", "AddOn"]),
  isActive: z.boolean(),
  modifiers: z
    .array(
      z.object({
        vehicleType: z.enum(["Sedan", "SUV", "Truck", "Van", "Luxury"]),
        priceAdjustment: z.number(),
      })
    )
    .optional(),
});

export type ServiceItemInput = z.infer<typeof serviceItemSchema>;
