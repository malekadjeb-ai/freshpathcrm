import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/src/db";
import { payments, invoices, jobs, users, notifications, customers } from "@/src/db/schema";
import { eq, like } from "drizzle-orm";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const stripe = await getStripe();
    const webhookSecret = await getStripeWebhookSecret();

    if (!stripe || !webhookSecret) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });
    }

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const invoiceId = session.metadata?.invoiceId;

      if (invoiceId && session.payment_status === "paid") {
        const db = getDb();
        const amountPaid = (session.amount_total || 0) / 100;
        const paymentIntentId = session.payment_intent as string | null;

        // Idempotency: check if this payment was already processed
        if (paymentIntentId) {
          const existingPayments = await db
            .select()
            .from(payments)
            .where(like(payments.notes, `%${paymentIntentId}%`));
          if (existingPayments.length > 0) {
            return NextResponse.json({ received: true, duplicate: true });
          }
        }

        // Record payment
        await db.insert(payments).values({
          invoiceId,
          amount: amountPaid,
          method: "Card",
          notes: `Stripe payment (${paymentIntentId || session.id})`,
        });

        // Check if fully paid
        const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));

        if (invoice) {
          const allPayments = await db.select().from(payments).where(eq(payments.invoiceId, invoiceId));
          const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);

          if (totalPaid >= invoice.total) {
            await db.update(invoices)
              .set({ status: "Paid", paidAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
              .where(eq(invoices.id, invoiceId));
            await db.update(jobs)
              .set({ status: "Paid", updatedAt: new Date().toISOString() })
              .where(eq(jobs.id, invoice.jobId));
          }
        }

        // Create notification
        try {
          const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
          if (inv) {
            const [customer] = await db
              .select({ name: customers.name })
              .from(customers)
              .where(eq(customers.id, inv.customerId));
            const allUsers = await db.select({ id: users.id }).from(users);
            for (const user of allUsers) {
              await db.insert(notifications).values({
                userId: user.id,
                type: "payment_received",
                title: "Payment Received",
                message: `${customer?.name ?? "Customer"} paid $${amountPaid.toFixed(2)} on ${inv.invoiceNumber}`,
                link: `/invoices/${invoiceId}`,
              });
            }
          }
        } catch {
          // Non-critical, continue
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
