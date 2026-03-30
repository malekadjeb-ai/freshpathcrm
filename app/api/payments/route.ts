import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { invoices, payments, jobs, customers } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";
import { paymentSchema } from "@/lib/validations/invoice";
import { fireWebhooks } from "@/lib/webhooks";
import { triggerWorkflows } from "@/lib/services/workflow-engine";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const body = await req.json();
    const data = paymentSchema.parse(body);

    // Verify the invoice belongs to tenant (through customer)
    const [inv] = await db.select({ customerId: invoices.customerId }).from(invoices).where(eq(invoices.id, data.invoiceId)).limit(1);
    if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, inv.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    // Create payment
    const payment = (
      await db
        .insert(payments)
        .values({
          invoiceId: data.invoiceId,
          amount: data.amount,
          method: data.method,
          paymentDate: new Date(data.paymentDate).toISOString(),
          notes: data.notes || null,
        })
        .returning()
    )[0];

    // Check total paid vs invoice total
    const invoice = (
      await db.select().from(invoices).where(eq(invoices.id, data.invoiceId))
    )[0];

    if (invoice) {
      const allPayments = await db
        .select()
        .from(payments)
        .where(eq(payments.invoiceId, data.invoiceId));
      const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);

      if (totalPaid >= invoice.total) {
        await db
          .update(invoices)
          .set({ status: "Paid", paidAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
          .where(eq(invoices.id, data.invoiceId));
        await db
          .update(jobs)
          .set({ status: "Paid", updatedAt: new Date().toISOString() })
          .where(eq(jobs.id, invoice.jobId));
      }
    }

    const paymentData = {
      id: payment.id,
      invoiceId: payment.invoiceId,
      amount: payment.amount,
      method: payment.method,
    };
    fireWebhooks("payment.received", paymentData);
    triggerWorkflows("invoice.paid", paymentData);

    return NextResponse.json(payment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
