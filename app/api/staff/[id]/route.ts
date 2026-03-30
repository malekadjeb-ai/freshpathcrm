import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { staff, jobs, customers, jobServices, serviceItems } from "@/src/db/schema";
import { eq, and, isNull, desc, inArray } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();

    const [staffMember] = await db.select().from(staff).where(and(eq(staff.id, params.id), eq(staff.tenantId, tenantId)));
    if (!staffMember) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Get assigned jobs
    const jobRows = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.assignedToId, params.id), isNull(jobs.deletedAt)))
      .orderBy(desc(jobs.scheduledAt))
      .limit(20);

    // Batch: fetch all customers and services for all jobs
    const jobCustIds = [...new Set(jobRows.map(j => j.customerId))];
    const jobIds = jobRows.map(j => j.id);

    const [staffCustBatch, staffSvcBatch] = await Promise.all([
      jobCustIds.length ? db.select({ id: customers.id, name: customers.name }).from(customers).where(inArray(customers.id, jobCustIds)) : Promise.resolve([]),
      jobIds.length ? db.select({
        id: jobServices.id,
        jobId: jobServices.jobId,
        serviceItemId: jobServices.serviceItemId,
        price: jobServices.price,
        quantity: jobServices.quantity,
        serviceItem: { name: serviceItems.name },
      }).from(jobServices).leftJoin(serviceItems, eq(jobServices.serviceItemId, serviceItems.id)).where(inArray(jobServices.jobId, jobIds)) : Promise.resolve([]),
    ]);

    const staffCustMap = new Map(staffCustBatch.map(c => [c.id, c]));
    const staffSvcMap = new Map<string, (typeof staffSvcBatch)[number][]>();
    for (const svc of staffSvcBatch) {
      if (!staffSvcMap.has(svc.jobId)) staffSvcMap.set(svc.jobId, []);
      staffSvcMap.get(svc.jobId)!.push(svc);
    }

    const enrichedJobs = jobRows.map((job) => ({
      ...job,
      customer: staffCustMap.get(job.customerId) ?? null,
      services: staffSvcMap.get(job.id) || [],
    }));

    return NextResponse.json({ ...staffMember, jobs: enrichedJobs });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const body = await req.json();
    const updateFields: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    if (body.name !== undefined) updateFields.name = body.name;
    if (body.phone !== undefined) updateFields.phone = body.phone;
    if (body.email !== undefined) updateFields.email = body.email;
    if (body.role !== undefined) updateFields.role = body.role;
    if (body.color !== undefined) updateFields.color = body.color;
    if (body.isActive !== undefined) updateFields.isActive = body.isActive;
    if (body.hireDate !== undefined) updateFields.hireDate = body.hireDate ? new Date(body.hireDate).toISOString() : null;
    if (body.notes !== undefined) updateFields.notes = body.notes;

    const [updatedStaff] = await db
      .update(staff)
      .set(updateFields)
      .where(and(eq(staff.id, params.id), eq(staff.tenantId, tenantId)))
      .returning();

    return NextResponse.json(updatedStaff);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();

    // Verify staff belongs to tenant
    const [existing] = await db.select({ id: staff.id }).from(staff).where(and(eq(staff.id, params.id), eq(staff.tenantId, tenantId)));
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Unassign all jobs first
    await db
      .update(jobs)
      .set({ assignedToId: null, updatedAt: new Date().toISOString() })
      .where(eq(jobs.assignedToId, params.id));

    await db.delete(staff).where(and(eq(staff.id, params.id), eq(staff.tenantId, tenantId)));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
