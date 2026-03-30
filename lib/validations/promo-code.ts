import { z } from "zod";

export const promoCodeSchema = z.object({
  code: z.string().min(1, "Code is required").max(30).transform((v) => v.toUpperCase().trim()),
  description: z.string().optional(),
  discountType: z.enum(["dollar", "percent"]),
  discountValue: z.number().min(0.01, "Discount must be greater than 0"),
  minOrderValue: z.number().min(0).nullable().optional(),
  maxUses: z.number().int().min(1).nullable().optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

export const validatePromoSchema = z.object({
  code: z.string().min(1),
  subtotal: z.number().min(0),
});

export type PromoCodeInput = z.infer<typeof promoCodeSchema>;
