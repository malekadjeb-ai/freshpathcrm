import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { recurringJobs, customers, jobs, jobServices, jobStatusHistory } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";
import { computeNextRunDate } from "@/lib/services/recurring";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const [rj] = await db.select().from(recurringJobs).where(eq(recurringJobs.id, params.id));

    if (!rj) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Verify recurring job's customer belongs to tenant
    const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, rj.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!rj.isActive) return NextResponse.json({ error: "Recurring job is paused" }, { status: 400 });

    const [customer] = await db.select().from(customers).where(eq(customers.id, rj.customerId));

    // Parse services JSON
    let serviceItems: { serviceItemId: string; price: number; quantity: number }[];
    try {
      serviceItems = JSON.parse(rj.services);
    } catch {
      return NextResponse.json({ error: "Invalid services data" }, { status: 400 });
    }

    const subtotal = serviceItems.reduce((sum, s) => sum + s.price * (s.quantity || 1), 0);
    const total = rj.totalPrice ?? subtotal;

    // Determine scheduled date
    const scheduledAt = rj.nextRunDate ? new Date(rj.nextRunDate) : new Date();
    // If timeOfDay is set, apply it
    if (rj.timeOfDay) {
      const [hours, minutes] = rj.timeOfDay.split(":").map(Number);
      scheduledAt.setHours(hours, minutes, 0, 0);
    }

    // Create the job
    const [job] = await db.insert(jobs).values({
      customerId: rj.customerId,
      vehicleId: rj.vehicleId || null,
      scheduledAt: scheduledAt.toISOString(),
      status: "Scheduled",
      location: rj.location,
      address: rj.address || customer?.address || null,
      city: customer?.city || null,
      subtotal,
      total,
      notes: rj.notes || null,
    }).returning();

    // Create job services
    for (const s of serviceItems) {
      await db.insert(jobServices).values({
        jobId: job.id,
        serviceItemId: s.serviceItemId,
        price: s.price,
        quantity: s.quantity || 1,
      });
    }

    // Create status history
    await db.insert(jobStatusHistory).values({
      jobId: job.id,
      fromStatus: null,
      toStatus: "Scheduled",
    });

    // Update recurring job: advance nextRunDate, increment counter
    const newNextRunDate = computeNextRunDate(
      rj.frequency,
      rj.dayOfWeek,
      scheduledAt
    );

    await db.update(recurringJobs).set({
      lastRunDate: new Date().toISOString(),
      nextRunDate: newNextRunDate instanceof Date ? newNextRunDate.toISOString() : newNextRunDate,
      jobsCreated: (rj.jobsCreated ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    }).where(eq(recurringJobs.id, params.id));

    return NextResponse.json({ job, nextRunDate: newNextRunDate });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
