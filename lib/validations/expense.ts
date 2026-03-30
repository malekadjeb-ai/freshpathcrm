import { z } from "zod";

export const expenseSchema = z.object({
  category: z.enum([
    "Supplies",
    "Fuel",
    "Equipment",
    "Insurance",
    "Marketing",
    "Software",
    "Vehicle",
    "Other",
  ]),
  description: z.string().min(1).max(300),
  amount: z.number().positive(),
  date: z.string(),
  vendor: z.string().optional().nullable(),
  isRecurring: z.boolean().optional(),
  jobId: z.string().optional().nullable(),
});
