import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/src/db";
import { invoices, jobs, customers, jobServices, serviceItems, payments, businessSettings } from "@/src/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();

    const invoice = (
      await db.select().from(invoices).where(eq(invoices.id, params.id))
    )[0];

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const job = invoice.jobId
      ? (await db.select().from(jobs).where(eq(jobs.id, invoice.jobId)))[0]
      : null;

    const [customer, jobSvcs, invoicePayments, settings] = await Promise.all([
      job
        ? (
            await db
              .select({ name: customers.name })
              .from(customers)
              .where(eq(customers.id, job.customerId))
          )[0]
        : null,
      job
        ? db
            .select({ serviceItem: { name: serviceItems.name } })
            .from(jobServices)
            .leftJoin(serviceItems, eq(jobServices.serviceItemId, serviceItems.id))
            .where(eq(jobServices.jobId, job.id))
        : [],
      db
        .select({ amount: payments.amount })
        .from(payments)
        .where(eq(payments.invoiceId, invoice.id)),
      db.select({ businessName: businessSettings.businessName }).from(businessSettings).limit(1),
    ]);

    const totalPaid = invoicePayments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(0, invoice.total - totalPaid);

    return NextResponse.json({
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total,
      remaining,
      status: invoice.status,
      customerName: customer?.name || "",
      services: jobSvcs
        .map((s) => s.serviceItem?.name)
        .filter(Boolean)
        .join(", "),
      businessName: settings[0]?.businessName || "Fresh Path Mobile Detailing",
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
