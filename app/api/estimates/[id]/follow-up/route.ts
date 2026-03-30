import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { estimates, customers, vehicles, tasks } from "@/src/db/schema";
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

    const { method, message } = await req.json();

    if (!method || !["sms", "email", "call"].includes(method)) {
      return NextResponse.json(
        { error: "method must be 'sms', 'email', or 'call'" },
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

    if (estimate.status !== "Sent") {
      return NextResponse.json(
        { error: "Can only follow up on sent estimates" },
        { status: 400 }
      );
    }

    // Fetch customer and vehicle
    const customer = estimate.customerId
      ? await db.select().from(customers).where(eq(customers.id, estimate.customerId)).then((r) => r[0] ?? null)
      : null;

    const _vehicle = estimate.vehicleId
      ? await db.select().from(vehicles).where(eq(vehicles.id, estimate.vehicleId)).then((r) => r[0] ?? null)
      : null;

    // Build template variables
    const vars = await getTemplateVariables(estimate.customerId);
    vars["{{estimate_number}}"] = estimate.estimateNumber;
    vars["{{estimate_total}}"] = `$${estimate.total.toFixed(2)}`;

    const name = vars["{{customer_first_name}}"] || vars["{{customer_name}}"] || "there";
    const business = vars["{{business_name}}"] || "Fresh Path Mobile Detailing";

    if (method === "call") {
      // Log follow-up call as a task
      await db.insert(tasks).values({
        title: `Follow up on estimate ${estimate.estimateNumber}`,
        description: message || `Call ${customer?.name ?? "customer"} about estimate ${estimate.estimateNumber}`,
        type: "follow_up",
        priority: "high",
        customerId: estimate.customerId,
      });
      return NextResponse.json({ success: true, method: "call", action: "task_created" });
    }

    const followUpBody = message
      ? resolveTemplate(message, vars)
      : method === "sms"
        ? `Hi ${name}, just following up on your estimate ${estimate.estimateNumber} for ${vars["{{estimate_total}}"]}. Would you like to move forward? — ${business}`
        : `Hi ${name},\n\nI wanted to follow up on the estimate we sent you (${estimate.estimateNumber} for ${vars["{{estimate_total}}"]}).\n\nWould you like to move forward, or do you have any questions?\n\nBest regards,\n${business}`;

    if (method === "sms") {
      if (!customer?.phone) {
        return NextResponse.json({ error: "Customer has no phone number" }, { status: 400 });
      }
      await sendSMS({
        to: customer.phone,
        body: followUpBody,
        customerId: estimate.customerId,
      });
    } else {
      if (!customer?.email) {
        return NextResponse.json({ error: "Customer has no email address" }, { status: 400 });
      }
      await sendEmail({
        to: customer.email,
        subject: `Following up on estimate ${estimate.estimateNumber}`,
        body: followUpBody,
        customerId: estimate.customerId,
      });
    }

    return NextResponse.json({ success: true, method });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
