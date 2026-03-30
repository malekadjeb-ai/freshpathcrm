import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { estimates, estimateItems, customers, vehicles, messageTemplates } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";
import { sendSMS, sendEmail, resolveTemplate, getTemplateVariables } from "@/lib/services/communication";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const { method, templateId } = await req.json();

    if (!method || !["sms", "email"].includes(method)) {
      return NextResponse.json(
        { error: "method must be 'sms' or 'email'" },
        { status: 400 }
      );
    }

    const db = getDb();

    const [estimate] = await db.select().from(estimates).where(eq(estimates.id, params.id));

    if (!estimate)
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });

    // Verify tenant ownership via customer
    if (estimate.customerId) {
      const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, estimate.customerId), eq(customers.tenantId, tenantId))).limit(1);
      if (!custCheck) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!["Draft", "Sent"].includes(estimate.status)) {
      return NextResponse.json(
        { error: "Cannot send estimate in current status" },
        { status: 400 }
      );
    }

    // Fetch customer
    const customer = estimate.customerId
      ? await db.select().from(customers).where(eq(customers.id, estimate.customerId)).then((r) => r[0] ?? null)
      : null;

    // Fetch vehicle
    const vehicle = estimate.vehicleId
      ? await db.select().from(vehicles).where(eq(vehicles.id, estimate.vehicleId)).then((r) => r[0] ?? null)
      : null;

    // Fetch line items
    const _lineItems = await db.select().from(estimateItems).where(eq(estimateItems.estimateId, params.id));

    // Build template variables
    const vars = await getTemplateVariables(estimate.customerId);
    vars["{{estimate_number}}"] = estimate.estimateNumber;
    vars["{{estimate_total}}"] = `$${estimate.total.toFixed(2)}`;
    if (vehicle) {
      vars["{{vehicle}}"] = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    }

    // Load template if provided, else use default message
    let messageBody: string;
    let subject = `Estimate ${estimate.estimateNumber} from Fresh Path`;

    if (templateId) {
      const [template] = await db
        .select()
        .from(messageTemplates)
        .where(eq(messageTemplates.id, templateId));
      if (template) {
        messageBody = resolveTemplate(template.body, vars);
        if (template.subject) subject = resolveTemplate(template.subject, vars);
      } else {
        messageBody = buildDefaultMessage(method, vars);
      }
    } else {
      messageBody = buildDefaultMessage(method, vars);
    }

    // Send via communication service
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
        customerId: estimate.customerId,
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
        customerId: estimate.customerId,
      });
    }

    // Update estimate status to Sent if it was Draft
    if (estimate.status === "Draft") {
      await db
        .update(estimates)
        .set({ status: "Sent", sentAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
        .where(eq(estimates.id, params.id));
    }

    return NextResponse.json({ success: true, method });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function buildDefaultMessage(
  method: string,
  vars: Record<string, string>
): string {
  const name = vars["{{customer_first_name}}"] || vars["{{customer_name}}"] || "there";
  const total = vars["{{estimate_total}}"] || "";
  const estNum = vars["{{estimate_number}}"] || "";
  const business = vars["{{business_name}}"] || "Fresh Path Mobile Detailing";

  if (method === "sms") {
    return `Hi ${name}! Your estimate ${estNum} for ${total} is ready. Reply or call us to approve or ask questions. — ${business}`;
  }
  return `Hi ${name},\n\nThank you for your interest! We've prepared estimate ${estNum} for ${total}.\n\nPlease review the details and let us know if you'd like to proceed or have any questions.\n\nBest regards,\n${business}`;
}
