import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  phoneCarrier: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
  neighborhood: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  referredById: z.string().optional(),
  source: z.string().optional(),
  sourceDetail: z.string().optional(),
  preferredContact: z.string().optional(),
  birthday: z.string().optional().nullable(),
  gateCode: z.string().optional(),
  specialInstructions: z.string().optional(),
  // Fleet / Commercial
  isCommercial: z.boolean().optional(),
  companyName: z.string().optional(),
  taxId: z.string().optional(),
  billingEmail: z.string().email().optional().or(z.literal("")),
  billingContact: z.string().optional(),
  paymentTerms: z.string().optional(),
  fleetSize: z.number().int().min(0).optional().nullable(),
  fleetDiscount: z.number().min(0).max(100).optional().nullable(),
  contractNotes: z.string().optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;

export const vehicleSchema = z.object({
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 2),
  color: z.string().optional(),
  licensePlate: z.string().optional(),
  vehicleType: z.enum(["Sedan", "SUV", "Truck", "Van", "Luxury"]),
  notes: z.string().optional(),
});

export type VehicleInput = z.infer<typeof vehicleSchema>;
