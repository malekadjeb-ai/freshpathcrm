import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { invoices, jobs, customers, jobServices, serviceItems, payments } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const stripe = await getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured. Add your Stripe keys in Settings." },
        { status: 400 }
      );
    }

    const db = getDb();

    const invoice = (
      await db.select().from(invoices).where(eq(invoices.id, params.id))
    )[0];

    if (!invoice)
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    // Verify invoice's customer belongs to tenant
    const [custCkCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, invoice.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCkCheck) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    if (invoice.status === "Paid")
      return NextResponse.json({ error: "Invoice is already paid" }, { status: 400 });

    const job = invoice.jobId
      ? (await db.select().from(jobs).where(eq(jobs.id, invoice.jobId)))[0]
      : null;

    const [customer, jobSvcs, invoicePayments] = await Promise.all([
      job
        ? (await db.select().from(customers).where(eq(customers.id, job.customerId)))[0]
        : null,
      job
        ? db
            .select({
              id: jobServices.id,
              serviceItem: { name: serviceItems.name },
            })
            .from(jobServices)
            .leftJoin(serviceItems, eq(jobServices.serviceItemId, serviceItems.id))
            .where(eq(jobServices.jobId, job.id))
        : [],
      db.select().from(payments).where(eq(payments.invoiceId, invoice.id)),
    ]);

    const totalPaid = invoicePayments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(0, invoice.total - totalPaid);

    if (remaining <= 0)
      return NextResponse.json({ error: "No balance remaining" }, { status: 400 });

    const { includeTip } = await req.json().catch(() => ({ includeTip: false }));

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const lineItems: {
      price_data: {
        currency: string;
        product_data: { name: string; description?: string };
        unit_amount: number;
      };
      quantity: number;
    }[] = [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Invoice ${invoice.invoiceNumber}`,
            description: jobSvcs
              .map((s) => s.serviceItem?.name)
              .filter(Boolean)
              .join(", "),
          },
          unit_amount: Math.round(remaining * 100),
        },
        quantity: 1,
      },
    ];

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${baseUrl}/pay/${invoice.id}?status=success`,
      cancel_url: `${baseUrl}/pay/${invoice.id}?status=cancelled`,
      customer_email: customer?.email || undefined,
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId,
      },
      ...(includeTip
        ? {
            payment_intent_data: {
              metadata: {
                invoiceId: invoice.id,
                allowTip: "true",
              },
            },
          }
        : {}),
    });

    // Save payment link to invoice
    await db
      .update(invoices)
      .set({ paymentLink: checkoutSession.url, updatedAt: new Date().toISOString() })
      .where(eq(invoices.id, params.id));

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
