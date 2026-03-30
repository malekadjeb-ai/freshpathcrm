import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { estimates, estimateItems, customers, jobs, jobServices } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const createJob = body.createJob ?? false;

    const db = getDb();

    const [estimate] = await db.select().from(estimates).where(eq(estimates.id, id));

    if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Verify tenant ownership via customer
    if (estimate.customerId) {
      const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, estimate.customerId), eq(customers.tenantId, tenantId))).limit(1);
      if (!custCheck) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (estimate.status === "Accepted") {
      return NextResponse.json({ error: "Already accepted" }, { status: 400 });
    }

    // Update estimate to Accepted
    const [updated] = await db
      .update(estimates)
      .set({
        status: "Accepted",
        respondedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(estimates.id, id))
      .returning();

    let jobId: string | null = null;

    if (createJob && estimate.customerId) {
      // Fetch customer for location
      const customer = await db
        .select()
        .from(customers)
        .where(eq(customers.id, estimate.customerId))
        .then((r) => r[0] ?? null);

      // Fetch line items
      const lineItemRows = await db
        .select()
        .from(estimateItems)
        .where(eq(estimateItems.estimateId, id));

      // Create job
      const [job] = await db
        .insert(jobs)
        .values({
          customerId: estimate.customerId,
          vehicleId: estimate.vehicleId,
          status: "Scheduled",
          total: estimate.total,
          location: customer?.city || "Richmond",
          scheduledAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        })
        .returning();

      jobId = job.id;

      // Create job services for catalog items
      const catalogItems = lineItemRows.filter((item) => item.serviceId != null);
      if (catalogItems.length > 0) {
        await db.insert(jobServices).values(
          catalogItems.map((item) => ({
            jobId: job.id,
            serviceItemId: item.serviceId!,
            price: item.price,
            quantity: item.quantity,
          }))
        );
      }

      // Link job to estimate
      await db
        .update(estimates)
        .set({ convertedJobId: job.id, updatedAt: new Date().toISOString() })
        .where(eq(estimates.id, id));
    }

    return NextResponse.json({
      ...updated,
      jobId,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
