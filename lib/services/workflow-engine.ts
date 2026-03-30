import { getDbAsync } from "@/src/db";
import { workflows, workflowLogs, communications, tasks, leads, tags, customerTags, activities, users, notifications, jobs, expenses } from "@/src/db/schema";
import { eq } from "drizzle-orm";

interface WorkflowTrigger {
  type: string;
  conditions?: Record<string, unknown>;
}

interface WorkflowAction {
  type: string;
  config?: Record<string, unknown>;
  delay?: number; // minutes
}

interface ActionResult {
  action: string;
  status: "success" | "failed" | "skipped";
  result?: string;
  timestamp: string;
}

/**
 * Fire workflow triggers for a given event.
 * Finds all active workflows matching the event and executes their actions.
 */
export function triggerWorkflows(event: string, data: Record<string, unknown>) {
  triggerWorkflowsAsync(event, data).catch((err) => {
    console.error("[workflow-engine] top-level error:", err);
  });
}

async function triggerWorkflowsAsync(event: string, data: Record<string, unknown>) {
  const db = await getDbAsync();
  const allWorkflows = await db
    .select()
    .from(workflows)
    .where(eq(workflows.isActive, true));

  const matched = allWorkflows.filter((w) => {
    if (w.isTemplate) return false;
    const trigger: WorkflowTrigger = JSON.parse(w.trigger);
    if (trigger.type !== event) return false;

    // Check conditions if any
    if (trigger.conditions) {
      return matchConditions(trigger.conditions, data);
    }
    return true;
  });

  if (matched.length === 0) return;

  await Promise.allSettled(
    matched.map((w) => executeWorkflow(w, event, data))
  );
}

function matchConditions(conditions: Record<string, unknown>, data: Record<string, unknown>): boolean {
  for (const [key, expected] of Object.entries(conditions)) {
    const actual = data[key];
    if (typeof expected === "object" && expected !== null) {
      const cond = expected as Record<string, unknown>;
      if (cond.$eq !== undefined && actual !== cond.$eq) return false;
      if (cond.$ne !== undefined && actual === cond.$ne) return false;
      if (cond.$in && !Array.isArray(cond.$in)) return false;
      if (cond.$in && Array.isArray(cond.$in) && !cond.$in.includes(actual)) return false;
    } else {
      if (actual !== expected) return false;
    }
  }
  return true;
}

async function executeWorkflow(
  workflow: { id: string; name: string; actions: string; runCount: number },
  triggeredBy: string,
  data: Record<string, unknown>
) {
  const db = await getDbAsync();
  const actions: WorkflowAction[] = JSON.parse(workflow.actions);
  const results: ActionResult[] = [];
  let hasError = false;

  for (const action of actions) {
    // Handle delays
    if (action.type === "wait" && action.delay) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(action.delay! * 60000, 300000))); // max 5 min
      results.push({
        action: "wait",
        status: "success",
        result: `Waited ${action.delay} minutes`,
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    // Handle condition
    if (action.type === "condition") {
      const condMet = action.config?.field
        ? matchConditions({ [action.config.field as string]: action.config?.value }, data)
        : true;
      results.push({
        action: "condition",
        status: condMet ? "success" : "skipped",
        result: condMet ? "Condition met" : "Condition not met — skipping remaining actions",
        timestamp: new Date().toISOString(),
      });
      if (!condMet) break;
      continue;
    }

    try {
      const result = await executeAction(action, data);
      results.push({
        action: action.type,
        status: "success",
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      hasError = true;
      results.push({
        action: action.type,
        status: "failed",
        result: err instanceof Error ? err.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Log the run
  await db.insert(workflowLogs).values({
    workflowId: workflow.id,
    triggeredBy,
    status: hasError ? (results.some((r) => r.status === "success") ? "partial" : "failed") : "success",
    actions: JSON.stringify(results),
    error: hasError ? results.find((r) => r.status === "failed")?.result || null : null,
  }).catch(() => {});

  // Update run count
  await db.update(workflows).set({
    runCount: (workflow.runCount ?? 0) + 1,
    lastRunAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).where(eq(workflows.id, workflow.id)).catch(() => {});
}

async function executeAction(
  action: WorkflowAction,
  data: Record<string, unknown>
): Promise<string> {
  const db = await getDbAsync();
  const config = action.config || {};

  switch (action.type) {
    case "send_sms": {
      const phone = (config.to as string) || (data.customerPhone as string);
      const message = interpolateTemplate((config.message as string) || "", data);
      if (!phone) return "No phone number available";
      await db.insert(communications).values({
        customerId: data.customerId as string,
        type: "sms",
        direction: "outbound",
        summary: message.slice(0, 100),
        body: message,
        status: "queued",
      });
      return `SMS queued to ${phone}`;
    }

    case "send_email": {
      const email = (config.to as string) || (data.customerEmail as string);
      const subject = interpolateTemplate((config.subject as string) || "Notification", data);
      const body = interpolateTemplate((config.body as string) || "", data);
      if (!email) return "No email available";
      await db.insert(communications).values({
        customerId: data.customerId as string,
        type: "email",
        direction: "outbound",
        summary: subject,
        body,
        status: "queued",
      });
      return `Email queued to ${email}`;
    }

    case "create_task": {
      const [task] = await db.insert(tasks).values({
        title: interpolateTemplate((config.title as string) || "Auto-generated task", data),
        description: interpolateTemplate((config.description as string) || "", data),
        priority: (config.priority as string) || "medium",
        completed: false,
        dueDate: config.dueDays
          ? new Date(Date.now() + (config.dueDays as number) * 86400000).toISOString()
          : null,
      }).returning();
      return `Task created: ${task.title}`;
    }

    case "update_lead_status": {
      const leadId = data.leadId as string;
      const newStatus = config.status as string;
      if (!leadId || !newStatus) return "Missing lead ID or status";
      await db.update(leads).set({ status: newStatus, updatedAt: new Date().toISOString() }).where(eq(leads.id, leadId));
      return `Lead status updated to ${newStatus}`;
    }

    case "update_customer_tag": {
      const customerId = data.customerId as string;
      const tagName = config.tag as string;
      if (!customerId || !tagName) return "Missing customer ID or tag";

      // Find or create the tag
      let [tag] = await db.select().from(tags).where(eq(tags.name, tagName));
      if (!tag) {
        [tag] = await db.insert(tags).values({ name: tagName }).returning();
      }

      if (config.action === "remove") {
        await db.delete(customerTags).where(eq(customerTags.tagId, tag.id));
        return `Tag "${tagName}" removed`;
      } else {
        // Upsert
        try {
          await db.insert(customerTags).values({ customerId, tagId: tag.id });
        } catch {
          // Already exists
        }
        return `Tag "${tagName}" added`;
      }
    }

    case "request_review": {
      const custId = data.customerId as string;
      if (!custId) return "No customer ID";
      await db.insert(communications).values({
        customerId: custId,
        type: "sms",
        direction: "outbound",
        summary: "Review request sent",
        body: interpolateTemplate(
          (config.message as string) ||
            "Hi {{customerName}}! Thanks for choosing Fresh Path. We'd love your feedback — could you leave us a quick review?",
          data
        ),
        status: "queued",
      });
      return "Review request queued";
    }

    case "send_rebook_prompt": {
      const custId2 = data.customerId as string;
      if (!custId2) return "No customer ID";
      await db.insert(communications).values({
        customerId: custId2,
        type: "sms",
        direction: "outbound",
        summary: "Rebook prompt sent",
        body: interpolateTemplate(
          (config.message as string) ||
            "Hi {{customerName}}! It's been a while since your last detail. Ready to book your next one? Reply YES to schedule.",
          data
        ),
        status: "queued",
      });
      return "Rebook prompt queued";
    }

    case "create_activity": {
      const custId3 = (config.customerId as string) || (data.customerId as string);
      const leadId = (config.leadId as string) || (data.leadId as string);
      if (!custId3 && !leadId) return "No customer or lead ID";
      const activityData: Record<string, unknown> = {
        type: (config.activityType as string) || "NOTE",
        summary: interpolateTemplate((config.summary as string) || "Automation note", data),
        direction: "outbound",
      };
      if (custId3) activityData.customerId = custId3;
      if (leadId) activityData.leadId = leadId;
      if (config.followUpDays) {
        activityData.followUpDate = new Date(Date.now() + (config.followUpDays as number) * 86400000).toISOString();
      }
      await db.insert(activities).values(activityData as typeof activities.$inferInsert);
      return `Activity created: ${activityData.summary}`;
    }

    case "send_notification": {
      const message = interpolateTemplate((config.message as string) || "Notification", data);
      const title = interpolateTemplate((config.title as string) || "Automation", data);
      // Find all users to notify
      const allUsers = await db.select({ id: users.id }).from(users).limit(10);
      for (const user of allUsers) {
        await db.insert(notifications).values({
          userId: user.id,
          type: "automation",
          title,
          message,
          link: (config.link as string) || null,
        });
      }
      return `Notification sent to ${allUsers.length} user(s): ${title}`;
    }

    case "update_status": {
      const entityType = (config.entityType as string) || (data.entityType as string);
      const entityId = (config.entityId as string) || (data.entityId as string) || (data.id as string);
      const newStatus = config.status as string;
      if (!entityId || !newStatus) return "Missing entity ID or status";
      if (entityType === "lead" || data.leadId) {
        await db.update(leads).set({ status: newStatus, updatedAt: new Date().toISOString() }).where(eq(leads.id, (data.leadId as string) || entityId));
        return `Lead status updated to ${newStatus}`;
      }
      if (entityType === "job" || data.jobId) {
        await db.update(jobs).set({ status: newStatus, updatedAt: new Date().toISOString() }).where(eq(jobs.id, (data.jobId as string) || entityId));
        return `Job status updated to ${newStatus}`;
      }
      return `Status update for ${entityType}: not supported`;
    }

    case "create_invoice": {
      return "Invoice creation via workflow not yet implemented";
    }

    case "create_expense": {
      const category = (config.category as string) || "Other";
      const description = interpolateTemplate((config.description as string) || "Auto-generated expense", data);
      const amount = typeof config.amount === "number" ? config.amount : parseFloat(String(data.amount || 0));
      if (amount <= 0) return "Skipped: expense amount is 0";
      await db.insert(expenses).values({
        category,
        description,
        amount,
        date: new Date().toISOString().split("T")[0],
        jobId: (data.jobId as string) || null,
        isRecurring: false,
      });
      return `Expense created: $${amount.toFixed(2)} (${category})`;
    }

    case "webhook": {
      const url = config.url as string;
      if (!url) return "No webhook URL configured";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: data.event || "workflow.action", data }),
        signal: AbortSignal.timeout(10000),
      });
      return `Webhook fired: HTTP ${res.status}`;
    }

    default:
      return `Unknown action type: ${action.type}`;
  }
}

function interpolateTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    return String(data[key] ?? "");
  });
}
