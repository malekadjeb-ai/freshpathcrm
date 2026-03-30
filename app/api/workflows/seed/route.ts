import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { workflows } from "@/src/db/schema";
import { eq } from "drizzle-orm";

const TEMPLATES = [
  {
    name: "Instant Lead Response",
    description:
      "Immediately engage new leads with a personal text and follow-up prompt",
    trigger: { type: "lead.created" },
    actions: [
      {
        type: "send_sms",
        config: {
          message:
            "Hey {{firstName}}! Thanks for reaching out to Fresh Path Mobile Detailing. I'm Malek — I'll personally take care of your {{vehicleInfo}}. What day works best for you this week?",
        },
      },
      { type: "wait", delay: 5 },
      {
        type: "send_sms",
        config: {
          message:
            "I can usually fit new clients in within 24-48 hours. Just reply with a preferred day and I'll lock you in",
        },
      },
      {
        type: "create_task",
        config: {
          title: "Follow up with {{name}} if no response in 2 hours",
          priority: "high",
          dueDays: 0,
        },
      },
    ],
  },
  {
    name: "Quote Follow-Up Sequence",
    description:
      "Multi-touch follow-up after sending an estimate to maximize conversion",
    trigger: { type: "estimate.sent" },
    actions: [
      { type: "wait", delay: 240 },
      {
        type: "send_sms",
        config: {
          message:
            "Hi {{firstName}}, just wanted to make sure you got the estimate I sent over. Any questions about the services or pricing? Happy to walk through it.",
        },
      },
      { type: "wait", delay: 2880 },
      {
        type: "send_sms",
        config: {
          message:
            "Hey {{firstName}} — still interested in getting your {{vehicleInfo}} detailed? I have a couple openings this week if you want to lock one in.",
        },
      },
      { type: "wait", delay: 7200 },
      {
        type: "send_sms",
        config: {
          message:
            "Last check-in on your detail estimate, {{firstName}}. The quote is valid for 7 more days. Let me know if you'd like to book or if anything changed!",
        },
      },
      {
        type: "update_lead_status",
        config: {
          status: "Follow-Up",
        },
      },
    ],
  },
  {
    name: "Post-Job Review Request",
    description:
      "Request a Google review after job completion with a gentle follow-up reminder",
    trigger: { type: "job.completed" },
    actions: [
      { type: "wait", delay: 120 },
      {
        type: "send_sms",
        config: {
          message:
            "Hi {{firstName}}! Thanks for choosing Fresh Path for your {{serviceName}}. If you loved the results, a Google review would mean the world to me: {{reviewLink}}",
        },
      },
      {
        type: "request_review",
        config: {
          message:
            "Hi {{firstName}}, we'd love to hear about your experience with Fresh Path Mobile Detailing. Your feedback helps us grow!",
        },
      },
      { type: "wait", delay: 4320 },
      {
        type: "send_sms",
        config: {
          message:
            "Hey {{firstName}}, quick reminder — your Google review really helps small businesses like mine grow. Takes 30 seconds: {{reviewLink}}",
        },
      },
    ],
  },
  {
    name: "Payment Reminder Sequence",
    description:
      "Escalating payment reminders for overdue invoices via SMS, email, and task creation",
    trigger: { type: "invoice.overdue" },
    actions: [
      {
        type: "send_sms",
        config: {
          message:
            "Hi {{firstName}}, friendly reminder that invoice {{invoiceNumber}} for ${{total}} is due. You can pay securely here: {{paymentLink}}",
        },
      },
      { type: "wait", delay: 4320 },
      {
        type: "send_sms",
        config: {
          message:
            "Hey {{firstName}}, just following up on invoice {{invoiceNumber}} (${{total}}). Please let me know if you have any questions. Pay here: {{paymentLink}}",
        },
      },
      { type: "wait", delay: 10080 },
      {
        type: "send_email",
        config: {
          subject: "Overdue Invoice {{invoiceNumber}}",
          body: "Dear {{firstName}},\n\nThis is a formal notice that invoice {{invoiceNumber}} for ${{total}} is now overdue. Please arrange payment at your earliest convenience using the secure link below:\n\n{{paymentLink}}\n\nIf you have already submitted payment, please disregard this notice. Otherwise, feel free to reach out if you have any questions or need to discuss payment arrangements.\n\nThank you,\nMalek\nFresh Path Mobile Detailing",
        },
      },
      {
        type: "create_task",
        config: {
          title: "Call {{name}} about overdue invoice {{invoiceNumber}}",
          priority: "high",
          dueDays: 0,
        },
      },
    ],
  },
  {
    name: "Reactivation Campaign",
    description:
      "Win back inactive customers with a personal message and discount offer",
    trigger: { type: "customer.inactive" },
    actions: [
      {
        type: "send_sms",
        config: {
          message:
            "Hey {{firstName}}! It's been a while since your last detail. Your {{vehicleInfo}} is probably ready for some love. Want me to get you on the schedule?",
        },
      },
      { type: "wait", delay: 10080 },
      {
        type: "send_sms",
        config: {
          message:
            "{{firstName}}, I'm offering $25 off your next full detail as a welcome-back special. Valid this month only. Just reply BOOK to schedule!",
        },
      },
      {
        type: "create_task",
        config: {
          title: "Reactivation call to {{name}}",
          priority: "medium",
          dueDays: 1,
        },
      },
    ],
  },
  {
    name: "Booking Confirmation + Reminders",
    description:
      "Send booking confirmation and day-before reminder for scheduled jobs",
    trigger: { type: "job.scheduled" },
    actions: [
      {
        type: "send_sms",
        config: {
          message:
            "Your detail is confirmed!\n\nDate: {{scheduledDate}}\nService: {{serviceName}}\nAddress: {{address}}\n\nI'll text you when I'm on my way. See you then! — Malek, Fresh Path",
        },
      },
      { type: "wait", delay: 1380 },
      {
        type: "send_sms",
        config: {
          message:
            "Reminder: Your {{serviceName}} is tomorrow. Please make sure the vehicle is accessible. See you soon!",
        },
      },
    ],
  },
  {
    name: "New Customer Welcome",
    description:
      "Welcome new customers and set expectations for communication",
    trigger: { type: "customer.created" },
    actions: [
      {
        type: "send_sms",
        config: {
          message:
            "Welcome to the Fresh Path family, {{firstName}}! You'll get appointment confirmations, reminders, and your service history right from your phone. Save this number!",
        },
      },
      {
        type: "create_task",
        config: {
          title:
            "Add {{name}} to recurring service discussion during next visit",
          priority: "low",
          dueDays: 7,
        },
      },
    ],
  },
];

// These templates should also be created as active workflow instances
const AUTO_ACTIVE_WORKFLOWS = [
  "Instant Lead Response",
  "Post-Job Review Request",
  "Booking Confirmation + Reminders",
  "New Customer Welcome",
];

export async function POST() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();

    // Idempotent: delete existing templates and active instances to allow re-seeding
    const allExisting = await db
      .select({ id: workflows.id, isTemplate: workflows.isTemplate, name: workflows.name })
      .from(workflows);

    const toDelete = allExisting.filter(
      (w) => w.isTemplate === true || (!w.isTemplate && AUTO_ACTIVE_WORKFLOWS.includes(w.name))
    );

    for (const w of toDelete) {
      await db.delete(workflows).where(eq(workflows.id, w.id));
    }

    // Create all templates (isTemplate: true, isActive: false)
    const templateRows = await Promise.all(
      TEMPLATES.map((t) =>
        db.insert(workflows).values({
          name: t.name,
          description: t.description,
          trigger: JSON.stringify(t.trigger),
          actions: JSON.stringify(t.actions),
          isActive: false,
          isTemplate: true,
        }).returning().then((r) => r[0])
      )
    );

    // Create active instances for key workflows (isTemplate: false, isActive: true)
    const activeTemplates = TEMPLATES.filter((t) =>
      AUTO_ACTIVE_WORKFLOWS.includes(t.name)
    );

    const activeInstances = await Promise.all(
      activeTemplates.map((t) =>
        db.insert(workflows).values({
          name: t.name,
          description: t.description,
          trigger: JSON.stringify(t.trigger),
          actions: JSON.stringify(t.actions),
          isActive: true,
          isTemplate: false,
        }).returning().then((r) => r[0])
      )
    );

    return NextResponse.json({
      message: "Workflows seeded successfully",
      templates: templateRows.length,
      activeInstances: activeInstances.length,
      activeWorkflows: activeInstances.map((w) => w.name),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
