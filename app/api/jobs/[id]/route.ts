import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import {
  jobs,
  customers,
  vehicles,
  jobServices,
  serviceItems,
  invoices,
  payments,
  jobStatusHistory,
  staff,
  customerTags,
  tags,
} from "@/src/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { updateJobSchema } from "@/lib/validations/job";
import { fireWebhooks } from "@/lib/webhooks";
import { triggerWorkflows } from "@/lib/services/workflow-engine";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { tenantId } = auth;

    const db = getDb();

    const [jobRow] = await db.select().from(jobs).where(eq(jobs.id, params.id));
    if (!jobRow) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    // Verify job's customer belongs to tenant
    const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, jobRow.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    // Fetch all related data in parallel
    const [customerRows, vehicleRows, serviceRows, invoiceRows, historyRows] = await Promise.all([
      db.select().from(customers).where(eq(customers.id, jobRow.customerId)),
      jobRow.vehicleId ? db.select().from(vehicles).where(eq(vehicles.id, jobRow.vehicleId)) : Promise.resolve([]),
      db
        .select({
          id: jobServices.id,
          jobId: jobServices.jobId,
          serviceItemId: jobServices.serviceItemId,
          customName: jobServices.name,
          price: jobServices.price,
          quantity: jobServices.quantity,
          serviceItem: {
            id: serviceItems.id,
            name: serviceItems.name,
            basePrice: serviceItems.basePrice,
            category: serviceItems.category,
          },
        })
        .from(jobServices)
        .leftJoin(serviceItems, eq(jobServices.serviceItemId, serviceItems.id))
        .where(eq(jobServices.jobId, params.id)),
      db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          status: invoices.status,
          total: invoices.total,
          payments: payments,
        })
        .from(invoices)
        .leftJoin(payments, eq(payments.invoiceId, invoices.id))
        .where(eq(invoices.jobId, params.id)),
      db
        .select()
        .from(jobStatusHistory)
        .where(eq(jobStatusHistory.jobId, params.id))
        .orderBy(asc(jobStatusHistory.createdAt)),
    ]);

    // Customer tags
    let customerWithTags: (typeof customerRows[0] & { tags?: { id: string | null; name: string | null; color: string | null }[] }) | null = customerRows[0] ?? null;
    if (customerWithTags) {
      const tagRows = await db
        .select({ id: tags.id, name: tags.name, color: tags.color })
        .from(customerTags)
        .leftJoin(tags, eq(customerTags.tagId, tags.id))
        .where(eq(customerTags.customerId, customerWithTags.id));
      customerWithTags = { ...customerWithTags, tags: tagRows };
    }

    // Collapse invoice payments (one invoice, multiple payments)
    let invoiceObj: Record<string, unknown> | null = null;
    if (invoiceRows.length > 0) {
      const inv = invoiceRows[0];
      const allPayments = invoiceRows.map((r) => r.payments).filter(Boolean);
      invoiceObj = { ...inv, payments: allPayments };
    }

    // Look up assigned staff if present
    let assignedStaff = null;
    if (jobRow.assignedToId) {
      const [staffRow] = await db
        .select({ id: staff.id, name: staff.name, color: staff.color, role: staff.role, phone: staff.phone })
        .from(staff)
        .where(eq(staff.id, jobRow.assignedToId));
      assignedStaff = staffRow ?? null;
    }

    return NextResponse.json({
      ...jobRow,
      customer: customerWithTags,
      vehicle: vehicleRows[0] ?? null,
      services: serviceRows,
      invoice: invoiceObj,
      statusHistory: historyRows,
      assignedStaff,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { tenantId } = auth;

    const db = getDb();

    const [existing] = await db.select().from(jobs).where(eq(jobs.id, params.id));
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Verify job's customer belongs to tenant
    const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, existing.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const parsed = updateJobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    const { services, ...data } = parsed.data;

    const subtotal = services?.reduce(
      (sum, s) => sum + s.price * s.quantity,
      0
    ) ?? data.subtotal ?? 0;

    const discountAmount =
      data.discountType === "percent"
        ? subtotal * ((data.discount || 0) / 100)
        : data.discount || 0;
    const total = Math.max(0, subtotal - discountAmount);

    const updateFields: Record<string, unknown> = {
      subtotal,
      total,
      updatedAt: new Date().toISOString(),
    };
    if (data.customerId !== undefined) updateFields.customerId = data.customerId;
    if (data.vehicleId !== undefined) updateFields.vehicleId = data.vehicleId;
    if (data.status !== undefined) updateFields.status = data.status;
    if (data.scheduledAt !== undefined) updateFields.scheduledAt = data.scheduledAt ? new Date(data.scheduledAt).toISOString() : null;
    if (data.startedAt !== undefined) updateFields.startedAt = data.startedAt ? new Date(data.startedAt).toISOString() : null;
    if (data.completedAt !== undefined) updateFields.completedAt = data.completedAt ? new Date(data.completedAt).toISOString() : null;
    if (data.address !== undefined) updateFields.address = data.address;
    if (data.city !== undefined) updateFields.city = data.city;
    if (data.location !== undefined) updateFields.location = data.location;
    if (data.discount !== undefined) updateFields.discount = data.discount;
    if (data.discountType !== undefined) updateFields.discountType = data.discountType;
    if (data.notes !== undefined) updateFields.notes = data.notes;
    if (data.internalNotes !== undefined) updateFields.internalNotes = data.internalNotes;
    if (data.photos !== undefined) updateFields.photos = data.photos;
    if (data.travelTime !== undefined) updateFields.travelTime = data.travelTime;
    if (data.mileage !== undefined) updateFields.mileage = data.mileage;
    if (data.showInGallery !== undefined) updateFields.showInGallery = data.showInGallery;

    const [updatedJob] = await db
      .update(jobs)
      .set(updateFields)
      .where(eq(jobs.id, params.id))
      .returning();

    // Replace services if provided
    if (services) {
      await db.delete(jobServices).where(eq(jobServices.jobId, params.id));
      if (services.length > 0) {
        await db.insert(jobServices).values(
          services.map((s) => ({
            jobId: params.id,
            serviceItemId: s.serviceItemId || null,
            name: s.name || null,
            price: s.price,
            quantity: s.quantity,
          }))
        );
      }
    }

    // Fetch enriched response
    const [customerRows, vehicleRows, serviceRows] = await Promise.all([
      db.select({ id: customers.id, name: customers.name }).from(customers).where(eq(customers.id, updatedJob.customerId)),
      updatedJob.vehicleId ? db.select().from(vehicles).where(eq(vehicles.id, updatedJob.vehicleId)) : Promise.resolve([]),
      db
        .select({
          id: jobServices.id,
          jobId: jobServices.jobId,
          serviceItemId: jobServices.serviceItemId,
          customName: jobServices.name,
          price: jobServices.price,
          quantity: jobServices.quantity,
          serviceItem: {
            id: serviceItems.id,
            name: serviceItems.name,
            basePrice: serviceItems.basePrice,
            category: serviceItems.category,
          },
        })
        .from(jobServices)
        .leftJoin(serviceItems, eq(jobServices.serviceItemId, serviceItems.id))
        .where(eq(jobServices.jobId, params.id)),
    ]);

    const job = {
      ...updatedJob,
      customer: customerRows[0] ?? null,
      vehicle: vehicleRows[0] ?? null,
      services: serviceRows,
    };

    // Fire webhook based on status change
    const webhookEvent = data.status === "Completed" ? "job.completed"
      : data.status === "Cancelled" ? "job.cancelled"
      : "job.updated";
    const jobEventData = {
      id: job.id,
      customerId: job.customerId,
      customerName: job.customer?.name,
      status: job.status,
      total: job.total,
    };
    fireWebhooks(webhookEvent, jobEventData);
    triggerWorkflows(webhookEvent, jobEventData);
    if (data.status) {
      triggerWorkflows("job.status_changed", { ...jobEventData, newStatus: data.status });
    }

    return NextResponse.json(job);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session, tenantId } = auth;

    // Only ADMIN/OWNER can delete jobs
    const role = session.user.role;
    if (role !== "ADMIN" && role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getDb();

    const [existing] = await db.select().from(jobs).where(eq(jobs.id, params.id));
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Verify job's customer belongs to tenant
    const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, existing.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db
      .update(jobs)
      .set({ deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .where(eq(jobs.id, params.id));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
