import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { reviews, customers, jobs, businessSettings, messageTemplates } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";
import { sendSMS, sendEmail, getTemplateVariables, resolveTemplate } from "@/lib/services/communication";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const { method, templateId } = await req.json();

    if (!method || !["sms", "email"].includes(method)) {
      return NextResponse.json({ error: "method must be 'sms' or 'email'" }, { status: 400 });
    }

    const [reviewRow] = await db
      .select({
        review: reviews,
        customer: customers,
        job: {
          id: jobs.id,
          status: jobs.status,
          scheduledAt: jobs.scheduledAt,
        },
      })
      .from(reviews)
      .leftJoin(customers, eq(reviews.customerId, customers.id))
      .leftJoin(jobs, eq(reviews.jobId, jobs.id))
      .where(eq(reviews.id, params.id));

    if (!reviewRow)
      return NextResponse.json({ error: "Review not found" }, { status: 404 });

    const review = reviewRow.review;
    const customer = reviewRow.customer;

    if (!customer) return NextResponse.json({ error: "Review customer not found" }, { status: 404 });

    // Verify customer belongs to tenant
    const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, review.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck) return NextResponse.json({ error: "Review not found" }, { status: 404 });

    const [settings] = await db.select().from(businessSettings).where(eq(businessSettings.tenantId, tenantId));
    const reviewUrl = settings?.googleReviewUrl || review.reviewUrl || "#";
    const vars = await getTemplateVariables(review.customerId, review.jobId || undefined);
    vars["{{review_link}}"] = reviewUrl;

    const name = vars["{{customer_first_name}}"] || vars["{{customer_name}}"] || "there";
    const business = vars["{{business_name}}"] || "Fresh Path Mobile Detailing";

    let messageBody: string;
    let subject = `How was your experience with ${business}?`;

    if (templateId) {
      const [template] = await db
        .select()
        .from(messageTemplates)
        .where(eq(messageTemplates.id, templateId));
      if (template) {
        messageBody = resolveTemplate(template.body, vars);
        if (template.subject) subject = resolveTemplate(template.subject, vars);
      } else {
        messageBody = buildDefaultMessage(method, name, business, reviewUrl);
      }
    } else {
      messageBody = buildDefaultMessage(method, name, business, reviewUrl);
    }

    if (method === "sms") {
      if (!customer.phone) {
        return NextResponse.json({ error: "Customer has no phone number" }, { status: 400 });
      }
      await sendSMS({
        to: customer.phone,
        body: messageBody,
        customerId: review.customerId,
        jobId: review.jobId || undefined,
      });
    } else {
      if (!customer.email) {
        return NextResponse.json({ error: "Customer has no email address" }, { status: 400 });
      }
      await sendEmail({
        to: customer.email,
        subject,
        body: messageBody,
        customerId: review.customerId,
        jobId: review.jobId || undefined,
      });
    }

    await db
      .update(reviews)
      .set({ requestSentAt: new Date().toISOString(), status: "sent" })
      .where(eq(reviews.id, params.id));

    return NextResponse.json({ success: true, method });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function buildDefaultMessage(method: string, name: string, business: string, reviewUrl: string): string {
  if (method === "sms") {
    return `Hi ${name}! Thank you for choosing ${business}. We'd love your feedback — please leave us a review: ${reviewUrl}`;
  }
  return `Hi ${name},\n\nThank you for choosing ${business}! We hope you loved the results.\n\nWould you mind taking a moment to leave us a review? It helps us grow and serve more customers like you.\n\n${reviewUrl}\n\nThank you!\n${business}`;
}
