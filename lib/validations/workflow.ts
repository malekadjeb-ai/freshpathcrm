import { z } from "zod";

export const TRIGGER_TYPES = [
  { value: "lead.created", label: "New Lead" },
  { value: "lead.status_changed", label: "Lead Status Changed" },
  { value: "estimate.created", label: "Estimate Created" },
  { value: "estimate.accepted", label: "Estimate Accepted" },
  { value: "estimate.declined", label: "Estimate Declined" },
  { value: "estimate.pending_days", label: "Estimate Pending X Days" },
  { value: "job.created", label: "Job Created" },
  { value: "job.scheduled", label: "Job Scheduled" },
  { value: "job.started", label: "Job Started" },
  { value: "job.completed", label: "Job Completed" },
  { value: "job.status_changed", label: "Job Status Changed" },
  { value: "invoice.created", label: "Invoice Created" },
  { value: "invoice.overdue", label: "Invoice Overdue" },
  { value: "invoice.paid", label: "Invoice Paid" },
  { value: "customer.created", label: "Customer Created" },
  { value: "customer.dormant", label: "Customer Inactive 60+ Days" },
  { value: "booking.new", label: "New Booking" },
  { value: "review.received", label: "Review Received" },
  { value: "activity.follow_up_due", label: "Follow-Up Due" },
  { value: "task.overdue", label: "Task Overdue" },
  { value: "schedule.daily", label: "Daily Schedule" },
] as const;

export const ACTION_TYPES = [
  { value: "create_activity", label: "Log Activity", icon: "StickyNote" },
  { value: "create_task", label: "Create Task", icon: "CheckSquare" },
  { value: "send_notification", label: "Send Notification", icon: "Bell" },
  { value: "update_status", label: "Update Status", icon: "ArrowRightCircle" },
  { value: "update_customer_tag", label: "Add/Remove Tag", icon: "Tag" },
  { value: "send_sms", label: "Send SMS", icon: "MessageSquare" },
  { value: "send_email", label: "Send Email", icon: "Mail" },
  { value: "request_review", label: "Request Review", icon: "Star" },
  { value: "send_rebook_prompt", label: "Send Rebook Prompt", icon: "RefreshCw" },
  { value: "create_invoice", label: "Create Invoice", icon: "FileText" },
  { value: "webhook", label: "Fire Webhook", icon: "Webhook" },
  { value: "wait", label: "Wait / Delay", icon: "Clock" },
  { value: "condition", label: "If/Else Condition", icon: "GitBranch" },
] as const;

export const workflowTriggerSchema = z.object({
  type: z.string(),
  conditions: z.record(z.string(), z.unknown()).optional(),
});

export const workflowActionSchema = z.object({
  type: z.string(),
  config: z.record(z.string(), z.unknown()).optional(),
  delay: z.number().optional(), // minutes
});

export const workflowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  trigger: workflowTriggerSchema,
  actions: z.array(workflowActionSchema).min(1, "At least one action is required"),
  isActive: z.boolean().optional(),
});
