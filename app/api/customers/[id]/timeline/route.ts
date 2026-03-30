import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { eq, and, isNull } from "drizzle-orm";
import {
  customers,
  activities,
  jobs,
  jobServices,
  serviceItems,
  invoices,
  payments,
  estimates,
  reviews,
} from "@/src/db/schema";
import { formatCurrency } from "@/lib/utils";

interface TimelineEntry {
  id: string;
  type: "activity" | "job" | "invoice" | "estimate" | "review";
  subtype: string;
  title: string;
  description: string | null;
  timestamp: string;
  linkedType?: string;
  linkedId?: string;
  metadata?: Record<string, unknown>;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const customerId = params.id;

    // Verify customer exists and belongs to tenant
    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
      .limit(1);

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Query all related records in parallel
    const [activityRows, jobRows, invoiceRows, estimateRows, reviewRows] = await Promise.all([
      db.select().from(activities).where(eq(activities.customerId, customerId)),
      db
        .select()
        .from(jobs)
        .where(and(eq(jobs.customerId, customerId), isNull(jobs.deletedAt))),
      db
        .select()
        .from(invoices)
        .where(and(eq(invoices.customerId, customerId), isNull(invoices.deletedAt))),
      db
        .select()
        .from(estimates)
        .where(and(eq(estimates.customerId, customerId), isNull(estimates.deletedAt))),
      db.select().from(reviews).where(eq(reviews.customerId, customerId)),
    ]);

    // Fetch job services for all jobs
    const jobIds = jobRows.map((j) => j.id);
    const jobServiceRows = jobIds.length
      ? await db
          .select({ jobService: jobServices, serviceItem: serviceItems })
          .from(jobServices)
          .innerJoin(serviceItems, eq(jobServices.serviceItemId, serviceItems.id))
          .where(
            jobIds.length === 1
              ? eq(jobServices.jobId, jobIds[0])
              : jobIds.reduce<ReturnType<typeof eq> | undefined>((acc, id) => {
                  const cond = eq(jobServices.jobId, id);
                  return acc ? (and(acc, cond) as ReturnType<typeof eq>) : cond;
                }, undefined)!
          )
      : [];

    // Fetch payments for all invoices
    const invoiceIds = invoiceRows.map((i) => i.id);
    const paymentRows = invoiceIds.length
      ? await db
          .select()
          .from(payments)
          .where(
            invoiceIds.length === 1
              ? eq(payments.invoiceId, invoiceIds[0])
              : invoiceIds.reduce<ReturnType<typeof eq> | undefined>((acc, id) => {
                  const cond = eq(payments.invoiceId, id);
                  return acc ? (and(acc, cond) as ReturnType<typeof eq>) : cond;
                }, undefined)!
          )
      : [];

    // Group service names by jobId
    const servicesByJob: Record<string, string[]> = {};
    for (const row of jobServiceRows as Array<{ jobService: typeof jobServices.$inferSelect; serviceItem: typeof serviceItems.$inferSelect }>) {
      const jid = row.jobService.jobId;
      if (!servicesByJob[jid]) servicesByJob[jid] = [];
      servicesByJob[jid].push(row.serviceItem?.name || (row as Record<string, unknown>).customName as string || "Custom");
    }

    // Group payments by invoiceId
    const paymentsByInvoice: Record<string, typeof payments.$inferSelect[]> = {};
    for (const p of paymentRows as typeof payments.$inferSelect[]) {
      if (!paymentsByInvoice[p.invoiceId]) paymentsByInvoice[p.invoiceId] = [];
      paymentsByInvoice[p.invoiceId].push(p);
    }

    const entries: TimelineEntry[] = [];

    // --- Activities ---
    for (const activity of activityRows) {
      entries.push({
        id: `activity-${activity.id}`,
        type: "activity",
        subtype: activity.type,
        title: getActivityTitle(activity.type, activity.direction),
        description: activity.summary,
        timestamp: activity.createdAt,
        linkedType: "activity",
        linkedId: activity.id,
        metadata: {
          direction: activity.direction,
          followUpDate: activity.followUpDate ?? null,
          followUpDone: activity.followUpDone,
        },
      });
    }

    // --- Jobs ---
    for (const job of jobRows) {
      const serviceNames = (servicesByJob[job.id] ?? []).join(", ");

      // Job created
      entries.push({
        id: `job-created-${job.id}`,
        type: "job",
        subtype: "created",
        title: "Job created",
        description: serviceNames || null,
        timestamp: job.createdAt,
        linkedType: "job",
        linkedId: job.id,
        metadata: { status: job.status, total: job.total },
      });

      // Job scheduled
      if (job.scheduledAt) {
        entries.push({
          id: `job-scheduled-${job.id}`,
          type: "job",
          subtype: "scheduled",
          title: "Job scheduled",
          description: serviceNames
            ? `${serviceNames} — ${formatCurrency(job.total)}`
            : formatCurrency(job.total),
          timestamp: job.scheduledAt,
          linkedType: "job",
          linkedId: job.id,
          metadata: { status: job.status, total: job.total },
        });
      }

      // Job started
      if (job.startedAt) {
        entries.push({
          id: `job-started-${job.id}`,
          type: "job",
          subtype: "started",
          title: "Job started",
          description: serviceNames || null,
          timestamp: job.startedAt,
          linkedType: "job",
          linkedId: job.id,
          metadata: { status: job.status, total: job.total },
        });
      }

      // Job completed
      if (job.completedAt) {
        entries.push({
          id: `job-completed-${job.id}`,
          type: "job",
          subtype: "completed",
          title: "Job completed",
          description: serviceNames
            ? `${serviceNames} — ${formatCurrency(job.total)}`
            : formatCurrency(job.total),
          timestamp: job.completedAt,
          linkedType: "job",
          linkedId: job.id,
          metadata: { status: job.status, total: job.total },
        });
      }
    }

    // --- Invoices ---
    for (const invoice of invoiceRows) {
      // Invoice created
      entries.push({
        id: `invoice-created-${invoice.id}`,
        type: "invoice",
        subtype: "created",
        title: `Invoice ${invoice.invoiceNumber} created`,
        description: formatCurrency(invoice.total),
        timestamp: invoice.createdAt,
        linkedType: "invoice",
        linkedId: invoice.id,
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          total: invoice.total,
        },
      });

      // Invoice sent
      if (invoice.sentAt) {
        entries.push({
          id: `invoice-sent-${invoice.id}`,
          type: "invoice",
          subtype: "sent",
          title: `Invoice ${invoice.invoiceNumber} sent`,
          description: `${formatCurrency(invoice.total)} — ${invoice.sentVia ?? "email"}`,
          timestamp: invoice.sentAt,
          linkedType: "invoice",
          linkedId: invoice.id,
          metadata: {
            invoiceNumber: invoice.invoiceNumber,
            status: invoice.status,
            total: invoice.total,
            sentVia: invoice.sentVia,
          },
        });
      }

      // Invoice paid
      if (invoice.paidAt) {
        const invoicePayments = paymentsByInvoice[invoice.id] ?? [];
        const totalPaid = invoicePayments.reduce((sum, p) => sum + p.amount, 0);
        entries.push({
          id: `invoice-paid-${invoice.id}`,
          type: "invoice",
          subtype: "paid",
          title: `Invoice ${invoice.invoiceNumber} paid`,
          description: formatCurrency(totalPaid),
          timestamp: invoice.paidAt,
          linkedType: "invoice",
          linkedId: invoice.id,
          metadata: {
            invoiceNumber: invoice.invoiceNumber,
            status: invoice.status,
            total: invoice.total,
            totalPaid,
            paymentCount: invoicePayments.length,
          },
        });
      }
    }

    // --- Estimates ---
    for (const estimate of estimateRows) {
      // Estimate created
      entries.push({
        id: `estimate-created-${estimate.id}`,
        type: "estimate",
        subtype: "created",
        title: `Estimate ${estimate.estimateNumber} created`,
        description: formatCurrency(estimate.total),
        timestamp: estimate.createdAt,
        linkedType: "estimate",
        linkedId: estimate.id,
        metadata: {
          estimateNumber: estimate.estimateNumber,
          status: estimate.status,
          total: estimate.total,
        },
      });

      // Estimate sent
      if (estimate.sentAt) {
        entries.push({
          id: `estimate-sent-${estimate.id}`,
          type: "estimate",
          subtype: "sent",
          title: `Estimate ${estimate.estimateNumber} sent`,
          description: formatCurrency(estimate.total),
          timestamp: estimate.sentAt,
          linkedType: "estimate",
          linkedId: estimate.id,
          metadata: {
            estimateNumber: estimate.estimateNumber,
            status: estimate.status,
            total: estimate.total,
          },
        });
      }

      // Estimate responded (accepted or declined)
      if (estimate.respondedAt) {
        const isAccepted = estimate.status === "Accepted";
        entries.push({
          id: `estimate-responded-${estimate.id}`,
          type: "estimate",
          subtype: isAccepted ? "accepted" : "declined",
          title: `Estimate ${estimate.estimateNumber} ${isAccepted ? "accepted" : "declined"}`,
          description: formatCurrency(estimate.total),
          timestamp: estimate.respondedAt,
          linkedType: "estimate",
          linkedId: estimate.id,
          metadata: {
            estimateNumber: estimate.estimateNumber,
            status: estimate.status,
            total: estimate.total,
            convertedJobId: estimate.convertedJobId,
          },
        });
      }
    }

    // --- Reviews ---
    for (const review of reviewRows) {
      entries.push({
        id: `review-${review.id}`,
        type: "review",
        subtype: review.status,
        title: review.rating
          ? `Left a ${review.rating}-star review`
          : "Review requested",
        description: review.content || null,
        timestamp: review.reviewedAt ?? review.createdAt,
        linkedType: "review",
        linkedId: review.id,
        metadata: {
          rating: review.rating,
          platform: review.platform,
          status: review.status,
          jobId: review.jobId,
        },
      });
    }

    // Sort by timestamp descending (newest first)
    entries.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json(entries);
  } catch (error) {
    console.error("Timeline API error:", error);
    return NextResponse.json(
      { error: "Failed to load timeline" },
      { status: 500 }
    );
  }
}

function getActivityTitle(type: string, direction: string | null): string {
  const dirLabel = direction === "INBOUND" ? "Incoming" : "Outgoing";

  switch (type) {
    case "CALL":
      return `${dirLabel} call`;
    case "TEXT":
      return `${dirLabel} text message`;
    case "EMAIL":
      return `${dirLabel} email`;
    case "IN_PERSON":
      return "In-person interaction";
    case "NOTE":
      return "Note added";
    default:
      return `Activity: ${type}`;
  }
}
