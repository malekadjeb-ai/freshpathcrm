import { z } from "zod";

export const invoiceSchema = z.object({
  jobId: z.string().min(1),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  tax: z.number().min(0).default(0),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;

export const invoicePatchSchema = z.object({
  status: z.enum(["Draft", "Sent", "Paid", "Overdue", "Cancelled"]).optional(),
  dueDate: z.string().optional(),
  notes: z.string().nullable().optional(),
});

export type InvoicePatchInput = z.infer<typeof invoicePatchSchema>;

export const paymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive("Amount must be positive"),
  method: z.enum(["Cash", "Venmo", "Zelle", "Card", "Check", "Other"]),
  paymentDate: z.string(),
  notes: z.string().optional(),
});

export type PaymentInput = z.infer<typeof paymentSchema>;
