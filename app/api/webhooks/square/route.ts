import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/src/db";
import { payments, invoices, jobs, users, notifications, customers } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { getSquareOrderInvoiceId, verifySquareWebhook } from "@/lib/square";

interface SquarePaymentObject {
  id: string;
  order_id?: string;
  amount_money?: { amount: number; currency: string };
  status: string;
}

interface SquareWebhookEvent {
  type: string;
  event_id: string;
  data?: {
    type: string;
    object?: {
      payment?: SquarePaymentObject;
    };
  };
}

async function handlePaymentCompleted(payment: SquarePaymentObject) {
  if (!payment.order_id || !payment.amount_money) return;

  const invoiceId = await getSquareOrderInvoiceId(payment.order_id);
  if (!invoiceId) return;

  const db = getDb();
  const amountPaid = (payment.amount_money.amount ?? 0) / 100;

  // Idempotency: skip if payment already recorded for this Square payment
  const existing = await db
    .select({ id: payments.id })
    .from(payments)
    .where(eq(payments.notes, `Square payment (${payment.id})`))
    .limit(1);
  if (existing.length > 0) return;

  await db.insert(payments).values({
    invoiceId,
    amount: amountPaid,
    method: "Card",
    notes: `Square payment (${payment.id})`,
  });

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId));

  if (invoice) {
    const allPayments = await db
      .select()
      .from(payments)
      .where(eq(payments.invoiceId, invoiceId));
    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);

    if (totalPaid >= invoice.total) {
      await db
        .update(invoices)
        .set({
          status: "Paid",
          paidAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(invoices.id, invoiceId));
      await db
        .update(jobs)
        .set({ status: "Paid", updatedAt: new Date().toISOString() })
        .where(eq(jobs.id, invoice.jobId));
    }

    // Notify all users
    try {
      const [customer] = await db
        .select({ name: customers.name })
        .from(customers)
        .where(eq(customers.id, invoice.customerId));
      const allUsers = await db.select({ id: users.id }).from(users);
      for (const user of allUsers) {
        await db.insert(notifications).values({
          userId: user.id,
          type: "payment_received",
          title: "Payment Received",
          message: `${customer?.name ?? "Customer"} paid $${amountPaid.toFixed(2)} on ${invoice.invoiceNumber}`,
          link: `/invoices/${invoiceId}`,
        });
      }
    } catch {
      // Non-critical
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const sigKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    if (!sigKey) {
      return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
    }

    const body = await req.text();
    const signature = req.headers.get("x-square-hmacsha256-signature") ?? "";
    const notificationUrl = process.env.SQUARE_WEBHOOK_URL ?? req.url;

    if (!(await verifySquareWebhook(body, signature, sigKey, notificationUrl))) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event: SquareWebhookEvent = JSON.parse(body);

    if (event.type === "payment.completed") {
      const payment = event.data?.object?.payment;
      if (payment) await handlePaymentCompleted(payment);
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
