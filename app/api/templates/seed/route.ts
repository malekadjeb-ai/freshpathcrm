import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { messageTemplates } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";

const TEMPLATES = [
  {
    name: "Booking Confirmation",
    type: "sms",
    category: "confirmation",
    body: "Your detail is booked! {{services}} on {{job_date}} at {{job_time}}. See you soon! — {{business_name}}",
    isDefault: true,
    isActive: true,
    usageCount: 0,
  },
  {
    name: "Day-Before Reminder",
    type: "sms",
    category: "reminder_24h",
    body: "Reminder: Your {{services}} is tomorrow at {{job_time}}. Reply if anything changes. — {{business_name}}",
    isDefault: true,
    isActive: true,
    usageCount: 0,
  },
  {
    name: "On-My-Way",
    type: "sms",
    category: "custom",
    body: "Good news — your detailer is on the way! ETA ~15 minutes. — {{business_name}}",
    isDefault: true,
    isActive: true,
    usageCount: 0,
  },
  {
    name: "Job Complete",
    type: "sms",
    category: "follow_up",
    body: "Your {{vehicle}} is looking fresh! We'd love your feedback: {{review_link}} — {{business_name}}",
    isDefault: true,
    isActive: true,
    usageCount: 0,
  },
  {
    name: "Estimate Sent",
    type: "email",
    category: "estimate",
    subject: "Your Estimate from {{business_name}}",
    body: "Hi {{customer_name}},\n\nHere's your estimate for {{services}}: {{estimate_total}}\n\nView details: {{booking_link}}\n\nThanks,\n{{business_name}}",
    isDefault: true,
    isActive: true,
    usageCount: 0,
  },
  {
    name: "Invoice Sent",
    type: "email",
    category: "invoice",
    subject: "Invoice #{{invoice_number}} from {{business_name}}",
    body: "Hi {{customer_name}},\n\nInvoice #{{invoice_number}} for {{total}} is ready.\n\nView & pay: {{payment_link}}\n\nThank you for choosing {{business_name}}!",
    isDefault: true,
    isActive: true,
    usageCount: 0,
  },
  {
    name: "Payment Thank You",
    type: "sms",
    category: "custom",
    body: "Payment received — {{total}}. Thank you for choosing {{business_name}}!",
    isDefault: true,
    isActive: true,
    usageCount: 0,
  },
  {
    name: "60-Day Win-Back",
    type: "sms",
    category: "rebook",
    body: "Hey {{customer_first_name}}, it's been a while! Book your next detail and get 10% off: {{booking_link}} — {{business_name}}",
    isDefault: true,
    isActive: true,
    usageCount: 0,
  },
  {
    name: "Referral Ask",
    type: "sms",
    category: "custom",
    body: "Know someone who needs a detail? Refer a friend and you both save $25! — {{business_name}}",
    isDefault: true,
    isActive: true,
    usageCount: 0,
  },
  {
    name: "Review Request",
    type: "sms",
    category: "review_request",
    body: "Hi {{customer_name}}, how did we do? Leave a quick review: {{review_link}} — {{business_name}}",
    isDefault: true,
    isActive: true,
    usageCount: 0,
  },
];

export async function POST() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    let created = 0;

    for (const t of TEMPLATES) {
      const existing = await db
        .select()
        .from(messageTemplates)
        .where(and(eq(messageTemplates.name, t.name), eq(messageTemplates.isDefault, true), eq(messageTemplates.tenantId, tenantId)));

      if (existing.length === 0) {
        await db.insert(messageTemplates).values({ ...t, tenantId });
        created++;
      }
    }

    return NextResponse.json({
      message: created > 0 ? "Templates seeded" : "Templates already seeded",
      created,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to seed templates" },
      { status: 500 }
    );
  }
}
