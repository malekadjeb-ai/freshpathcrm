import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import {
  invoices,
  jobs,
  customers,
  vehicles,
  jobServices,
  serviceItems,
  payments,
  automationExecutions,
  workflows,
} from "@/src/db/schema";
import { eq, and, inArray, like } from "drizzle-orm";
import { invoicePatchSchema } from "@/lib/validations/invoice";
import { triggerWorkflows } from "@/lib/services/workflow-engine";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { tenantId } = auth;

    const db = getDb();

    const invoice = (
      await db.select().from(invoices).where(eq(invoices.id, params.id))
    )[0];

    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    // Verify invoice's customer belongs to tenant
    const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, invoice.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const job = invoice.jobId
      ? (await db.select().from(jobs).where(eq(jobs.id, invoice.jobId)))[0]
      : null;

    const [customer, vehicle, jobSvcs, invoicePayments] = await Promise.all([
      job
        ? (await db.select().from(customers).where(eq(customers.id, job.customerId)))[0]
        : null,
      job?.vehicleId
        ? (await db.select().from(vehicles).where(eq(vehicles.id, job.vehicleId)))[0]
        : null,
      job
        ? db
            .select({
              id: jobServices.id,
              jobId: jobServices.jobId,
              serviceItemId: jobServices.serviceItemId,
              price: jobServices.price,
              quantity: jobServices.quantity,
              serviceItem: {
                id: serviceItems.id,
                name: serviceItems.name,
                description: serviceItems.description,
                basePrice: serviceItems.basePrice,
                category: serviceItems.category,
                isActive: serviceItems.isActive,
                estimatedMinutes: serviceItems.estimatedMinutes,
                sortOrder: serviceItems.sortOrder,
                deletedAt: serviceItems.deletedAt,
                createdAt: serviceItems.createdAt,
                updatedAt: serviceItems.updatedAt,
              },
            })
            .from(jobServices)
            .leftJoin(serviceItems, eq(jobServices.serviceItemId, serviceItems.id))
            .where(eq(jobServices.jobId, job.id))
        : [],
      db.select().from(payments).where(eq(payments.invoiceId, invoice.id)),
    ]);

    return NextResponse.json({
      ...invoice,
      job: job
        ? {
            ...job,
            customer: customer || null,
            vehicle: vehicle || null,
            services: jobSvcs,
          }
        : null,
      payments: invoicePayments,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { tenantId } = auth;

    const db = getDb();

    // Verify record exists and belongs to tenant
    const existing = (
      await db.select().from(invoices).where(eq(invoices.id, params.id))
    )[0];
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const [custPatch] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, existing.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custPatch) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const parsed = invoicePatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data = parsed.data;

    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    if (data.status !== undefined) updateData.status = data.status;
    if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate).toISOString();
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.status === "Paid") updateData.paidAt = new Date().toISOString();

    const updated = (
      await db
        .update(invoices)
        .set(updateData)
        .where(eq(invoices.id, params.id))
        .returning()
    )[0];

    if (data.status === "Paid") {
      await db
        .update(jobs)
        .set({ status: "Paid", updatedAt: new Date().toISOString() })
        .where(eq(jobs.id, updated.jobId));
    }

    // Fetch job + customer for response
    const job = updated.jobId
      ? (await db.select().from(jobs).where(eq(jobs.id, updated.jobId)))[0]
      : null;
    const customer = job
      ? (
          await db
            .select({ id: customers.id, name: customers.name })
            .from(customers)
            .where(eq(customers.id, job.customerId))
        )[0]
      : null;
    const invoicePayments = await db
      .select()
      .from(payments)
      .where(eq(payments.invoiceId, updated.id));

    const invoice = {
      ...updated,
      job: job ? { ...job, customer: customer || null } : null,
      payments: invoicePayments,
    };

    // Trigger workflow on overdue status change
    if (data.status === "Overdue" && customer) {
      const firstName = customer.name.split(" ")[0];
      triggerWorkflows("invoice.overdue", {
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        paymentLink: invoice.paymentLink ?? "",
        firstName,
        name: customer.name,
      });
    }

    // Cancel running overdue automations when invoice is paid
    if (data.status === "Paid") {
      // Find workflow IDs where trigger contains "invoice.overdue"
      const overdueWorkflows = await db
        .select({ id: workflows.id })
        .from(workflows)
        .where(like(workflows.trigger, "%invoice.overdue%"));

      if (overdueWorkflows.length > 0) {
        const wfIds = overdueWorkflows.map((w) => w.id);
        await db
          .update(automationExecutions)
          .set({
            status: "cancelled",
            completedAt: new Date().toISOString(),
          })
          .where(
            and(
              eq(automationExecutions.status, "running"),
              inArray(automationExecutions.workflowId, wfIds)
            )
          );
      }
    }

    return NextResponse.json(invoice);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
