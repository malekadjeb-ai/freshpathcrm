import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { invoices, customers } from "@/src/db/schema";
import { and, isNull, lt, notInArray, inArray } from "drizzle-orm";
import { triggerWorkflows } from "@/lib/services/workflow-engine";

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session, tenantId: _tenantId } = auth;

    const db = getDb();

    const overdueInvoices = await db
      .select()
      .from(invoices)
      .where(
        and(
          notInArray(invoices.status, ["Paid", "Draft"]),
          lt(invoices.dueDate, new Date().toISOString()),
          isNull(invoices.deletedAt)
        )
      );

    if (overdueInvoices.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    // Fetch customers for overdue invoices
    const customerIds = [...new Set(overdueInvoices.map((i) => i.customerId))];
    const customerRows = await db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(inArray(customers.id, customerIds));

    const customerMap = Object.fromEntries(customerRows.map((c) => [c.id, c]));

    for (const invoice of overdueInvoices) {
      const customer = customerMap[invoice.customerId];
      if (!customer) continue;

      const firstName = customer.name.split(" ")[0];

      triggerWorkflows("invoice.overdue", {
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        tenantId: session.user?.id ?? "",
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        paymentLink: invoice.paymentLink ?? "",
        firstName,
        name: customer.name,
      });
    }

    return NextResponse.json({ count: overdueInvoices.length });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
