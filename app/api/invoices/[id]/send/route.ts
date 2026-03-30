import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { invoices, customers, jobs, jobServices, serviceItems, vehicles } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";
import { sendSMS, sendEmail, resolveTemplate, getTemplateVariables } from "@/lib/services/communication";
import { messageTemplates } from "@/src/db/schema";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const { method } = await req.json();

    if (!method || !["sms", "email"].includes(method)) {
      return NextResponse.json(
        { error: "method must be 'sms' or 'email'" },
        { status: 400 }
      );
    }

    const invoice = (
      await db.select().from(invoices).where(eq(invoices.id, params.id))
    )[0];

    if (!invoice)
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    // Verify invoice's customer belongs to tenant
    const [custSendCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, invoice.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custSendCheck) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const customer = invoice.customerId
      ? (await db.select().from(customers).where(eq(customers.id, invoice.customerId)))[0]
      : null;

    const job = invoice.jobId
      ? (await db.select().from(jobs).where(eq(jobs.id, invoice.jobId)))[0]
      : null;

    const [_jobSvcs, _vehicle] = await Promise.all([
      job
        ? db
            .select({
              id: jobServices.id,
              jobId: jobServices.jobId,
              serviceItemId: jobServices.serviceItemId,
              price: jobServices.price,
              quantity: jobServices.quantity,
              serviceItem: {
                id: serviceItems.id,
                name: serviceItems.name,
              },
            })
            .from(jobServices)
            .leftJoin(serviceItems, eq(jobServices.serviceItemId, serviceItems.id))
            .where(eq(jobServices.jobId, job.id))
        : [],
      job?.vehicleId
        ? (await db.select().from(vehicles).where(eq(vehicles.id, job.vehicleId)))[0]
        : null,
    ]);

    const vars = await getTemplateVariables(invoice.customerId, invoice.jobId || undefined);
    vars["{{invoice_number}}"] = invoice.invoiceNumber;
    vars["{{total}}"] = `$${invoice.total.toFixed(2)}`;
    vars["{{due_date}}"] = invoice.dueDate
      ? new Date(invoice.dueDate).toLocaleDateString("en-US")
      : "Due on receipt";
    if (invoice.paymentLink) {
      vars["{{payment_link}}"] = invoice.paymentLink;
    }

    // Check for invoice template
    const template = (
      await db
        .select()
        .from(messageTemplates)
        .where(eq(messageTemplates.type, "invoice"))
        .limit(1)
    ).find((t) => t.isActive);

    let messageBody: string;
    let subject = `Invoice ${invoice.invoiceNumber} from ${vars["{{business_name}}"] || "Fresh Path"}`;

    if (template) {
      messageBody = resolveTemplate(template.body, vars);
      if (template.subject) subject = resolveTemplate(template.subject, vars);
    } else {
      const name = vars["{{customer_first_name}}"] || vars["{{customer_name}}"] || "there";
      const business = vars["{{business_name}}"] || "Fresh Path Mobile Detailing";
      const paymentLink = vars["{{payment_link}}"];

      if (method === "sms") {
        messageBody = `Hi ${name}! Your invoice ${invoice.invoiceNumber} for ${vars["{{total}}"]} is ready.${paymentLink ? ` Pay online: ${paymentLink}` : ""} — ${business}`;
      } else {
        messageBody = `Hi ${name},\n\nYour invoice ${invoice.invoiceNumber} for ${vars["{{total}}"]} is ready.\n\n${paymentLink ? `Pay online: ${paymentLink}\n\n` : ""}Due: ${vars["{{due_date}}"]}\n\nThank you for your business!\n${business}`;
      }
    }

    if (method === "sms") {
      if (!customer?.phone) {
        return NextResponse.json(
          { error: "Customer has no phone number" },
          { status: 400 }
        );
      }
      await sendSMS({
        to: customer.phone,
        body: messageBody,
        customerId: invoice.customerId,
        jobId: invoice.jobId || undefined,
      });
    } else {
      if (!customer?.email) {
        return NextResponse.json(
          { error: "Customer has no email address" },
          { status: 400 }
        );
      }
      await sendEmail({
        to: customer.email,
        subject,
        body: messageBody,
        customerId: invoice.customerId,
        jobId: invoice.jobId || undefined,
      });
    }

    // Mark as sent if not already
    if (invoice.status === "Draft") {
      await db
        .update(invoices)
        .set({ status: "Sent", sentAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
        .where(eq(invoices.id, params.id));
    }

    return NextResponse.json({ success: true, method });
  } catch (error) {
    console.error("Invoice send error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
