import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/src/db";
import { invoices, jobs, customers, vehicles, jobServices, serviceItems, payments } from "@/src/db/schema";
import { eq } from "drizzle-orm";

// Public route — no auth required
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();

    const invoice = (
      await db.select().from(invoices).where(eq(invoices.id, params.id))
    )[0];

    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const job = invoice.jobId
      ? (await db.select().from(jobs).where(eq(jobs.id, invoice.jobId)))[0]
      : null;

    const [customer, vehicle, jobSvcs, invoicePayments] = await Promise.all([
      job
        ? (
            await db
              .select({
                name: customers.name,
                email: customers.email,
                phone: customers.phone,
                address: customers.address,
                city: customers.city,
              })
              .from(customers)
              .where(eq(customers.id, job.customerId))
          )[0]
        : null,
      job?.vehicleId
        ? (
            await db
              .select({
                year: vehicles.year,
                make: vehicles.make,
                model: vehicles.model,
                color: vehicles.color,
              })
              .from(vehicles)
              .where(eq(vehicles.id, job.vehicleId))
          )[0]
        : null,
      job
        ? db
            .select({
              id: jobServices.id,
              jobId: jobServices.jobId,
              serviceItemId: jobServices.serviceItemId,
              price: jobServices.price,
              quantity: jobServices.quantity,
              serviceItem: { name: serviceItems.name },
            })
            .from(jobServices)
            .leftJoin(serviceItems, eq(jobServices.serviceItemId, serviceItems.id))
            .where(eq(jobServices.jobId, job.id))
        : [],
      db
        .select({
          amount: payments.amount,
          method: payments.method,
          createdAt: payments.createdAt,
        })
        .from(payments)
        .where(eq(payments.invoiceId, invoice.id)),
    ]);

    // Track view
    if (!invoice.viewedAt) {
      await db
        .update(invoices)
        .set({ viewedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
        .where(eq(invoices.id, params.id));
    }

    const paid = invoicePayments.reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      total: invoice.total,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      discount: invoice.discount,
      paid,
      remaining: invoice.total - paid,
      dueDate: invoice.dueDate,
      createdAt: invoice.createdAt,
      notes: invoice.notes,
      customer,
      vehicle,
      services: jobSvcs.map((s) => ({
        name: s.serviceItem?.name || "Service",
        quantity: s.quantity,
        price: s.price,
        total: s.price * s.quantity,
      })),
      payments: invoicePayments,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
