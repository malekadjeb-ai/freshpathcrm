import { z } from "zod";

export const estimateItemSchema = z.object({
  serviceId: z.string().optional().nullable(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0),
  quantity: z.number().int().min(1).default(1),
});

export const createEstimateSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  vehicleId: z.string().optional().nullable(),
  lineItems: z.array(estimateItemSchema).min(1, "At least one line item is required"),
  discount: z.number().min(0).default(0),
  taxRate: z.number().min(0).default(0),
  notes: z.string().optional(),
  validUntil: z.string().optional().nullable(),
});

export const updateEstimateSchema = z.object({
  customerId: z.string().min(1).optional(),
  vehicleId: z.string().nullable().optional(),
  lineItems: z.array(estimateItemSchema).min(1).optional(),
  discount: z.number().min(0).optional(),
  taxRate: z.number().min(0).optional(),
  notes: z.string().nullable().optional(),
  validUntil: z.string().nullable().optional(),
  status: z.enum(["Draft", "Sent", "Viewed", "Accepted", "Approved", "Declined", "Expired", "Converted"]).optional(),
});

export type CreateEstimateInput = z.infer<typeof createEstimateSchema>;
export type UpdateEstimateInput = z.infer<typeof updateEstimateSchema>;
