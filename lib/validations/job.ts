import { z } from "zod";

export const jobServiceSchema = z.object({
  serviceItemId: z.string().optional(),
  name: z.string().optional(),
  price: z.number().min(0),
  quantity: z.number().int().min(1).default(1),
});

export const createJobSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  vehicleId: z.string().optional(),
  services: z.array(jobServiceSchema).min(1, "At least one service is required"),
  scheduledAt: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  location: z.string().default("Richmond"),
  discount: z.number().min(0).default(0),
  discountType: z.enum(["dollar", "percent"]).default("dollar"),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  promoCodeId: z.string().optional(),
});

export const updateJobSchema = z.object({
  customerId: z.string().min(1).optional(),
  vehicleId: z.string().nullable().optional(),
  services: z.array(jobServiceSchema).min(1).optional(),
  scheduledAt: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  status: z
    .enum(["Scheduled", "InProgress", "Completed", "Invoiced", "Paid", "Cancelled"])
    .optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  location: z.string().optional(),
  subtotal: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  discountType: z.enum(["dollar", "percent"]).optional(),
  total: z.number().min(0).optional(),
  notes: z.string().nullable().optional(),
  internalNotes: z.string().nullable().optional(),
  photos: z.string().optional(),
  travelTime: z.number().int().min(0).nullable().optional(),
  mileage: z.number().min(0).nullable().optional(),
  showInGallery: z.boolean().optional(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
