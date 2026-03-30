import { z } from "zod";

export const checklistItemSchema = z.object({
  label: z.string().min(1),
  required: z.boolean().default(false),
});

export const checklistSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  serviceItemId: z.string().nullable().optional(),
  items: z.array(checklistItemSchema).min(1, "At least one item is required"),
  isActive: z.boolean().default(true),
});

export const jobChecklistItemSchema = z.object({
  label: z.string(),
  required: z.boolean(),
  checked: z.boolean(),
  note: z.string().optional(),
});

export const updateJobChecklistSchema = z.object({
  items: z.array(jobChecklistItemSchema),
});

export type ChecklistInput = z.infer<typeof checklistSchema>;
export type ChecklistItem = z.infer<typeof checklistItemSchema>;
export type JobChecklistItem = z.infer<typeof jobChecklistItemSchema>;
