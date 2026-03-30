import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { estimates, estimateItems, customers, jobs, jobServices, jobStatusHistory } from "@/src/db/schema";
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

    const [estimate] = await db.select().from(estimates).where(eq(estimates.id, params.id));

    if (!estimate)
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });

    // Verify tenant ownership via customer
    if (estimate.customerId) {
      const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, estimate.customerId), eq(customers.tenantId, tenantId))).limit(1);
      if (!custCheck) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (estimate.status !== "Approved") {
      return NextResponse.json(
        { error: "Only approved estimates can be converted" },
        { status: 400 }
      );
    }

    // Fetch line items with service info
    const lineItemRows = await db
      .select({
        id: estimateItems.id,
        serviceId: estimateItems.serviceId,
        name: estimateItems.name,
        price: estimateItems.price,
        quantity: estimateItems.quantity,
      })
      .from(estimateItems)
      .where(eq(estimateItems.estimateId, params.id));

    if (lineItemRows.length === 0) {
      return NextResponse.json(
        { error: "Estimate has no line items to convert" },
        { status: 400 }
      );
    }

    // Separate catalog items from custom items
    const catalogItems = lineItemRows.filter((item) => item.serviceId);
    const customItems = lineItemRows.filter((item) => !item.serviceId);

    // Fetch customer for location
    const _customer = estimate.customerId
      ? await db.select().from(customers).where(eq(customers.id, estimate.customerId)).then((r) => r[0] ?? null)
      : null;

    const notes = [
      estimate.notes,
      customItems.length > 0
        ? `Custom items: ${customItems.map((i) => `${i.name} ($${i.price})`).join(", ")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    // Create job
    const [job] = await db
      .insert(jobs)
      .values({
        customerId: estimate.customerId,
        vehicleId: estimate.vehicleId,
        location: "Richmond",
        subtotal: estimate.subtotal,
        discount: estimate.discount,
        total: estimate.total,
        notes: notes || null,
        status: "Scheduled",
      })
      .returning();

    // Create job services for catalog items
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

    // Create status history entry
    await db.insert(jobStatusHistory).values({
      jobId: job.id,
      fromStatus: null,
      toStatus: "Scheduled",
    });

    // Update estimate
    await db
      .update(estimates)
      .set({
        status: "Converted",
        convertedJobId: job.id,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(estimates.id, params.id));

    return NextResponse.json(job, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
