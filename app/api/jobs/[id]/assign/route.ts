import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { jobs, customers, vehicles, jobServices, serviceItems, staff } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();

    // Verify job's customer belongs to tenant
    const [jobRow] = await db.select({ customerId: jobs.customerId }).from(jobs).where(eq(jobs.id, params.id)).limit(1);
    if (!jobRow) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, jobRow.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const { staffId } = await req.json();

    // Validate staff exists if assigning (null = unassign)
    if (staffId) {
      const [staffMember] = await db.select().from(staff).where(eq(staff.id, staffId));
      if (!staffMember) return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
      if (!staffMember.isActive) return NextResponse.json({ error: "Staff member is inactive" }, { status: 400 });
    }

    const [updatedJob] = await db
      .update(jobs)
      .set({ assignedToId: staffId || null, updatedAt: new Date().toISOString() })
      .where(eq(jobs.id, params.id))
      .returning();

    // Fetch enriched response
    const [customerRows, vehicleRows, serviceRows] = await Promise.all([
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
    ]);

    return NextResponse.json({
      ...updatedJob,
      customer: customerRows[0] ?? null,
      vehicle: vehicleRows[0] ?? null,
      services: serviceRows,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
