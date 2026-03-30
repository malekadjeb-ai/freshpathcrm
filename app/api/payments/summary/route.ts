import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { invoices, payments, jobs, customers } from "@/src/db/schema";
import { and, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { startOfMonth, endOfMonth } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();

    // Pre-fetch tenant customer IDs for scoping
    const tenantCustRows = await db.select({ id: customers.id }).from(customers).where(eq(customers.tenantId, tenantId));
    const tenantCustIds = tenantCustRows.map(c => c.id);

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const now = new Date();
    const monthStart = startOfMonth(now).toISOString();
    const monthEnd = endOfMonth(now).toISOString();

    // Build date filter conditions for payments
    const dateConditions = [];
    if (from) dateConditions.push(gte(payments.createdAt, new Date(from).toISOString()));
    if (to) dateConditions.push(lte(payments.createdAt, new Date(to).toISOString()));

    // Get all payments with invoice + job + customer data
    const allPayments = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        method: payments.method,
        notes: payments.notes,
        createdAt: payments.createdAt,
        invoiceId: payments.invoiceId,
        invoiceNumber: invoices.invoiceNumber,
        invoiceStatus: invoices.status,
        jobId: invoices.jobId,
      })
      .from(payments)
      .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
      .where(dateConditions.length > 0 ? and(...dateConditions) : undefined)
      .orderBy(sql`${payments.createdAt} desc`);

    // Fetch customer info for each payment via job
    const jobIds = [...new Set(allPayments.map((p) => p.jobId).filter(Boolean))] as string[];
    const jobRows = jobIds.length
      ? await db
          .select({ id: jobs.id, customerId: jobs.customerId })
          .from(jobs)
          .where(inArray(jobs.id, jobIds))
      : [];
    const customerIds = [...new Set(jobRows.map((j) => j.customerId))];
    const customerRows = customerIds.length
      ? await db
          .select({ id: customers.id, name: customers.name })
          .from(customers)
          .where(inArray(customers.id, customerIds))
      : [];

    const jobMap = Object.fromEntries(jobRows.map((j) => [j.id, j]));
    const customerMap = Object.fromEntries(customerRows.map((c) => [c.id, c]));

    // Monthly payments total
    const monthPaymentsRows = await db
      .select({ amount: payments.amount })
      .from(payments)
      .where(
        and(
          gte(payments.createdAt, monthStart),
          lte(payments.createdAt, monthEnd)
        )
      );
    const receivedThisMonth = monthPaymentsRows.reduce((sum, p) => sum + p.amount, 0);

    // Outstanding invoices (sent but not paid), scoped to tenant
    const outstandingRows = tenantCustIds.length
      ? await db
          .select({ total: invoices.total })
          .from(invoices)
          .where(
            and(or(eq(invoices.status, "Sent"), eq(invoices.status, "Overdue")), inArray(invoices.customerId, tenantCustIds))
          )
      : [];
    const outstandingBalance = outstandingRows.reduce((sum, i) => sum + i.total, 0);
    const outstandingCount = outstandingRows.length;

    // Overdue invoices, scoped to tenant
    const overdueRows = tenantCustIds.length
      ? await db
          .select({ total: invoices.total })
          .from(invoices)
          .where(and(eq(invoices.status, "Overdue"), inArray(invoices.customerId, tenantCustIds)))
      : [];
    const overdueAmount = overdueRows.reduce((sum, i) => sum + i.total, 0);
    const overdueCount = overdueRows.length;

    return NextResponse.json({
      payments: allPayments.map((p) => {
        const jobRow = p.jobId ? jobMap[p.jobId] : null;
        const customer = jobRow ? customerMap[jobRow.customerId] : null;
        return {
          id: p.id,
          amount: p.amount,
          method: p.method,
          notes: p.notes,
          createdAt: p.createdAt,
          invoiceId: p.invoiceId,
          invoiceNumber: p.invoiceNumber,
          customerName: customer?.name || "Unknown",
          customerId: customer?.id,
          status: p.invoiceStatus,
        };
      }),
      summary: {
        receivedThisMonth,
        outstandingBalance,
        outstandingCount,
        overdueAmount,
        overdueCount,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
