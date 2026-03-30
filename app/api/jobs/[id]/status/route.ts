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
  jobStatusHistory,
  activities,
  notifications,
  reviews,
} from "@/src/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { recalculateHealthScore } from "@/lib/services/customer-health";
import { schedulePostJobFollowUp } from "@/lib/services/scheduled-messages";
import { triggerWorkflows } from "@/lib/services/workflow-engine";
import { createAutoExpenses } from "@/lib/services/auto-expense";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session, tenantId } = auth;

    const db = getDb();
    const { status, note } = await req.json();

    const [job] = await db.select().from(jobs).where(eq(jobs.id, params.id));
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    // Verify job's customer belongs to tenant
    const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, job.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const updateFields: Record<string, unknown> = { status, updatedAt: new Date().toISOString() };
    if (status === "InProgress" && !job.startedAt) {
      updateFields.startedAt = new Date().toISOString();
    }
    if (status === "Completed" && !job.completedAt) {
      updateFields.completedAt = new Date().toISOString();
      if (job.startedAt) {
        updateFields.actualDuration = Math.round(
          (Date.now() - new Date(job.startedAt).getTime()) / 60000
        );
      }
    }

    const [updatedJob] = await db
      .update(jobs)
      .set(updateFields)
      .where(eq(jobs.id, params.id))
      .returning();

    // Insert status history entry
    await db.insert(jobStatusHistory).values({
      jobId: params.id,
      fromStatus: job.status,
      toStatus: status,
      note: note || null,
    });

    // Fetch enriched data for response
    const [customerRows, vehicleRows, serviceRows, invoiceRows, historyRows] = await Promise.all([
      db.select({ id: customers.id, name: customers.name }).from(customers).where(eq(customers.id, updatedJob.customerId)),
      updatedJob.vehicleId ? db.select().from(vehicles).where(eq(vehicles.id, updatedJob.vehicleId)) : Promise.resolve([]),
      db
        .select({
          id: jobServices.id,
          jobId: jobServices.jobId,
          serviceItemId: jobServices.serviceItemId,
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
      db.select().from(invoices).where(eq(invoices.jobId, params.id)),
      db
        .select()
        .from(jobStatusHistory)
        .where(eq(jobStatusHistory.jobId, params.id))
        .orderBy(asc(jobStatusHistory.createdAt)),
    ]);

    const customer = customerRows[0] ?? null;

    const updated = {
      ...updatedJob,
      customer,
      vehicle: vehicleRows[0] ?? null,
      services: serviceRows,
      invoice: invoiceRows[0] ?? null,
      statusHistory: historyRows,
    };

    // Create "On My Way" activity log when en route
    if (status === "EnRoute" && customer) {
      try {
        await db.insert(activities).values({
          customerId: customer.id,
          type: "NOTE",
          direction: "OUTBOUND",
          summary: "On my way notification sent",
        });
        await db.insert(notifications).values({
          userId: (session.user as { id: string }).id,
          type: "job_enroute",
          title: "On My Way Sent",
          message: `En route to ${customer.name}`,
          link: `/jobs/${params.id}`,
        });
      } catch {}
    }

    // Create notification, review request, and recalculate health score on job completion
    if (status === "Completed" && customer) {
      try {
        await db.insert(notifications).values({
          userId: (session.user as { id: string }).id,
          type: "job_completed",
          title: "Job Completed",
          message: `Job for ${customer.name} has been completed`,
          link: `/jobs/${params.id}`,
        });
      } catch {}
      try {
        await recalculateHealthScore(customer.id);
      } catch {}
      try {
        await schedulePostJobFollowUp(params.id, 2);
      } catch {}
      // Trigger job.completed workflows (review request, etc.)
      try {
        triggerWorkflows("job.completed", {
          jobId: params.id,
          customerId: customer.id,
          customerName: customer.name,
          firstName: customer.name.split(" ")[0],
          serviceName: serviceRows.map((s) => s.serviceItem?.name).filter(Boolean).join(", "),
        });
      } catch {}
      // Auto-create expenses (mileage + supplies)
      try {
        await createAutoExpenses(params.id);
      } catch {}
      // Auto-create review request
      try {
        const [existingReview] = await db.select().from(reviews).where(eq(reviews.jobId, params.id));
        if (!existingReview) {
          await db.insert(reviews).values({
            customerId: customer.id,
            jobId: params.id,
            platform: "google",
            status: "pending",
          });
        }
      } catch {}
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
