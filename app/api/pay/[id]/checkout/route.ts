import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/src/db";
import { invoices, jobs, customers, jobServices, serviceItems, payments } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stripe = await getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: "Online payments are not available at this time" },
        { status: 400 }
      );
    }

    const db = getDb();

    const invoice = (
      await db.select().from(invoices).where(eq(invoices.id, params.id))
    )[0];

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status === "Paid") {
      return NextResponse.json({ error: "Invoice is already paid" }, { status: 400 });
    }

    const job = invoice.jobId
      ? (await db.select().from(jobs).where(eq(jobs.id, invoice.jobId)))[0]
      : null;

    const [customer, jobSvcs, invoicePayments] = await Promise.all([
      job
        ? (
            await db
              .select({ name: customers.name, email: customers.email })
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
    ]);

    const totalPaid = invoicePayments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(0, invoice.total - totalPaid);

    if (remaining <= 0) {
      return NextResponse.json({ error: "No balance remaining" }, { status: 400 });
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
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
      ],
      mode: "payment",
      success_url: `${baseUrl}/pay/${invoice.id}?status=success`,
      cancel_url: `${baseUrl}/pay/${invoice.id}?status=cancelled`,
      customer_email: customer?.email || undefined,
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
