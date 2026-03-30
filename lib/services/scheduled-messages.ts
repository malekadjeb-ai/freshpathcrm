import { getDbAsync } from "@/src/db";
import { jobs, customers, businessSettings, messageTemplates, scheduledMessages } from "@/src/db/schema";
import { eq, like, and } from "drizzle-orm";
import { sendSMS, sendEmail, getTemplateVariables, resolveTemplate } from "./communication";
import { subHours, addHours } from "date-fns";

/**
 * Schedule a booking confirmation message for a job.
 * Sends immediately (scheduledAt = now).
 */
export async function scheduleBookingConfirmation(jobId: string) {
  const db = await getDbAsync();

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  if (!job) return null;

  const [customer] = await db.select().from(customers).where(eq(customers.id, job.customerId));
  if (!customer?.phone) return null;

  const [settings] = await db.select().from(businessSettings).limit(1);
  const businessName = settings?.businessName || "Fresh Path Mobile Detailing";

  const vars = await getTemplateVariables(job.customerId, jobId);

  // Get services for job
  const { jobServices, serviceItems } = await import("@/src/db/schema");
  const services = await db
    .select({ name: serviceItems.name })
    .from(jobServices)
    .innerJoin(serviceItems, eq(jobServices.serviceItemId, serviceItems.id))
    .where(eq(jobServices.jobId, jobId));
  const serviceNames = services.map((s) => s.name).join(", ");

  // Check for a "booking_confirmation" template
  const [template] = await db
    .select()
    .from(messageTemplates)
    .where(eq(messageTemplates.type, "booking_confirmation"));

  let body: string;
  if (template) {
    body = resolveTemplate(template.body, { ...vars, "{{services}}": serviceNames });
  } else {
    const dateStr = job.scheduledAt
      ? new Date(job.scheduledAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
      : "your scheduled date";
    const timeStr = job.scheduledAt
      ? new Date(job.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      : "";
    body = `Hi ${vars["{{customer_first_name}}"] || "there"}! Your booking with ${businessName} is confirmed for ${dateStr}${timeStr ? ` at ${timeStr}` : ""}. Services: ${serviceNames}. We'll see you then!`;
  }

  const [msg] = await db.insert(scheduledMessages).values({
    customerId: job.customerId,
    jobId,
    channel: "sms",
    to: customer.phone,
    body,
    status: "pending",
    scheduledAt: new Date().toISOString(),
  }).returning();

  return msg;
}

/**
 * Schedule a reminder for a job (e.g., 24 hours before).
 */
export async function scheduleJobReminder(jobId: string, hoursBefore: number = 24) {
  const db = await getDbAsync();

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  if (!job || !job.scheduledAt) return null;

  const [customer] = await db.select().from(customers).where(eq(customers.id, job.customerId));
  if (!customer?.phone) return null;

  const reminderTime = subHours(new Date(job.scheduledAt), hoursBefore);

  // Don't schedule if reminder time is in the past
  if (reminderTime <= new Date()) return null;

  // Don't duplicate — check if one already exists
  const existing = await db
    .select()
    .from(scheduledMessages)
    .where(
      and(
        eq(scheduledMessages.jobId, jobId),
        eq(scheduledMessages.status, "pending"),
        like(scheduledMessages.body, "%reminder%")
      )
    );
  if (existing.length > 0) return existing[0];

  const [settings] = await db.select().from(businessSettings).limit(1);
  const businessName = settings?.businessName || "Fresh Path Mobile Detailing";
  const vars = await getTemplateVariables(job.customerId, jobId);

  const { jobServices, serviceItems } = await import("@/src/db/schema");
  const services = await db
    .select({ name: serviceItems.name })
    .from(jobServices)
    .innerJoin(serviceItems, eq(jobServices.serviceItemId, serviceItems.id))
    .where(eq(jobServices.jobId, jobId));
  const serviceNames = services.map((s) => s.name).join(", ");

  // Check for a "reminder" template
  const [template] = await db
    .select()
    .from(messageTemplates)
    .where(eq(messageTemplates.type, "reminder"));

  let body: string;
  if (template) {
    body = resolveTemplate(template.body, { ...vars, "{{services}}": serviceNames });
  } else {
    const dateStr = new Date(job.scheduledAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const timeStr = new Date(job.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    body = `Hi ${vars["{{customer_first_name}}"] || "there"}! This is a reminder that your ${businessName} appointment is tomorrow, ${dateStr} at ${timeStr}. Services: ${serviceNames}. Reply STOP to opt out.`;
  }

  const [msg] = await db.insert(scheduledMessages).values({
    customerId: job.customerId,
    jobId,
    channel: "sms",
    to: customer.phone,
    body,
    status: "pending",
    scheduledAt: reminderTime.toISOString(),
  }).returning();

  return msg;
}

/**
 * Schedule a follow-up / thank-you message after job completion.
 */
export async function schedulePostJobFollowUp(jobId: string, hoursAfter: number = 2) {
  const db = await getDbAsync();

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  if (!job) return null;

  const [customer] = await db.select().from(customers).where(eq(customers.id, job.customerId));
  if (!customer?.phone) return null;

  const [settings] = await db.select().from(businessSettings).limit(1);
  const businessName = settings?.businessName || "Fresh Path Mobile Detailing";
  const reviewUrl = settings?.googleReviewUrl || "#";
  const vars = await getTemplateVariables(job.customerId, jobId);

  const [template] = await db
    .select()
    .from(messageTemplates)
    .where(eq(messageTemplates.type, "follow_up"));

  let body: string;
  if (template) {
    body = resolveTemplate(template.body, { ...vars, "{{review_link}}": reviewUrl });
  } else {
    body = `Hi ${vars["{{customer_first_name}}"] || "there"}! Thank you for choosing ${businessName}. We hope you love the results! If you have a moment, we'd really appreciate a review: ${reviewUrl}`;
  }

  const sendAt = addHours(new Date(), hoursAfter);

  const [msg] = await db.insert(scheduledMessages).values({
    customerId: job.customerId,
    jobId,
    channel: "sms",
    to: customer.phone,
    body,
    status: "pending",
    scheduledAt: sendAt.toISOString(),
  }).returning();

  return msg;
}

/**
 * Process all pending scheduled messages that are due.
 * Call this from a cron endpoint or API route.
 */
export async function processScheduledMessages() {
  const db = await getDbAsync();
  const now = new Date();

  const pending = await db
    .select()
    .from(scheduledMessages)
    .where(
      and(
        eq(scheduledMessages.status, "pending")
      )
    )
    .limit(50);

  // Filter by scheduledAt <= now in memory (SQLite lte on text ISO string works lexicographically)
  const due = pending.filter((msg) => new Date(msg.scheduledAt) <= now);

  // Fetch customers
  const customerIds = [...new Set(due.map((m) => m.customerId))];
  const customerList = await Promise.all(
    customerIds.map((id) => db.select().from(customers).where(eq(customers.id, id)).then((r) => r[0]))
  );
  const customerMap = new Map(customerList.filter(Boolean).map((c) => [c!.id, c!]));

  const results = [];

  for (const msg of due) {
    const _customer = customerMap.get(msg.customerId);
    try {
      if (msg.channel === "sms") {
        await sendSMS({
          to: msg.to,
          body: msg.body,
          customerId: msg.customerId,
          jobId: msg.jobId || undefined,
        });
      } else if (msg.channel === "email") {
        await sendEmail({
          to: msg.to,
          subject: msg.subject || "Message from Fresh Path",
          body: msg.body,
          customerId: msg.customerId,
          jobId: msg.jobId || undefined,
        });
      }

      await db.update(scheduledMessages).set({
        status: "sent",
        sentAt: new Date().toISOString(),
      }).where(eq(scheduledMessages.id, msg.id));

      results.push({ id: msg.id, status: "sent" });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      await db.update(scheduledMessages).set({
        status: msg.retryCount >= 2 ? "failed" : "pending",
        error: errorMsg,
        retryCount: (msg.retryCount ?? 0) + 1,
      }).where(eq(scheduledMessages.id, msg.id));
      results.push({ id: msg.id, status: "error", error: errorMsg });
    }
  }

  return results;
}
