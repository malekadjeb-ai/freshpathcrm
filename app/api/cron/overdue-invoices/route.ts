import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/src/db";
import { invoices, customers, businessSettings } from "@/src/db/schema";
import { and, isNull, lt, notInArray, inArray } from "drizzle-orm";
import { triggerWorkflows } from "@/lib/services/workflow-engine";
import { verifyCronRequest } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = verifyCronRequest(req);
  if (denied) return denied;

  try {
    const db = getDb();

    const tenantIds = (
      await db.select({ tenantId: businessSettings.tenantId }).from(businessSettings)
    ).map((s) => s.tenantId);

    if (tenantIds.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    const customerRows = await db
      .select({ id: customers.id, name: customers.name, tenantId: customers.tenantId })
      .from(customers)
      .where(inArray(customers.tenantId, tenantIds));

    if (customerRows.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    const customerMap = Object.fromEntries(customerRows.map((c) => [c.id, c]));
    const customerIds = customerRows.map((c) => c.id);

    const overdueInvoices = await db
      .select()
      .from(invoices)
      .where(
        and(
          notInArray(invoices.status, ["Paid", "Draft"]),
          lt(invoices.dueDate, new Date().toISOString()),
          isNull(invoices.deletedAt),
          inArray(invoices.customerId, customerIds),
        ),
      );

    if (overdueInvoices.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    for (const invoice of overdueInvoices) {
      const customer = customerMap[invoice.customerId];
      if (!customer) continue;

      const firstName = customer.name.split(" ")[0];

      triggerWorkflows("invoice.overdue", {
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        tenantId: customer.tenantId,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        paymentLink: invoice.paymentLink ?? "",
        firstName,
        name: customer.name,
      });
    }

    return NextResponse.json({ count: overdueInvoices.length });
  } catch (err) {
    console.error("[CRON] Overdue invoices error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
