import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { estimates, estimateItems, customers, vehicles, serviceItems, jobs, notifications } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";
import { updateEstimateSchema } from "@/lib/validations/estimate";
import { triggerWorkflows } from "@/lib/services/workflow-engine";

async function fetchEstimateWithRelations(db: ReturnType<typeof import("@/src/db").getDb>, id: string) {
  const [estimate] = await db.select().from(estimates).where(eq(estimates.id, id));
  if (!estimate) return null;

  const customer = estimate.customerId
    ? await db
        .select({
          id: customers.id,
          name: customers.name,
          phone: customers.phone,
          email: customers.email,
          address: customers.address,
          city: customers.city,
          zip: customers.zip,
        })
        .from(customers)
        .where(eq(customers.id, estimate.customerId))
        .then((r) => r[0] ?? null)
    : null;

  const vehicle = estimate.vehicleId
    ? await db.select().from(vehicles).where(eq(vehicles.id, estimate.vehicleId)).then((r) => r[0] ?? null)
    : null;

  const lineItems = await db
    .select({
      id: estimateItems.id,
      estimateId: estimateItems.estimateId,
      serviceId: estimateItems.serviceId,
      name: estimateItems.name,
      description: estimateItems.description,
      price: estimateItems.price,
      quantity: estimateItems.quantity,
      createdAt: estimateItems.createdAt,
      service: {
        id: serviceItems.id,
        name: serviceItems.name,
        description: serviceItems.description,
        basePrice: serviceItems.basePrice,
        category: serviceItems.category,
      },
    })
    .from(estimateItems)
    .leftJoin(serviceItems, eq(estimateItems.serviceId, serviceItems.id))
    .where(eq(estimateItems.estimateId, id));

  const convertedJob = estimate.convertedJobId
    ? await db
        .select({ id: jobs.id, status: jobs.status })
        .from(jobs)
        .where(eq(jobs.id, estimate.convertedJobId))
        .then((r) => r[0] ?? null)
    : null;

  return { ...estimate, customer, vehicle, lineItems, convertedJob };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { tenantId } = auth;

    const db = getDb();
    const result = await fetchEstimateWithRelations(db, params.id);

    if (!result)
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });

    // Verify estimate's customer belongs to tenant
    if (result.customer?.id) {
      const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, result.customer.id), eq(customers.tenantId, tenantId))).limit(1);
      if (!custCheck) return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    return NextResponse.json(result);
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
    const { tenantId } = auth;

    const db = getDb();

    const [existing] = await db.select().from(estimates).where(eq(estimates.id, params.id));
    if (!existing)
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });

    // Verify estimate's customer belongs to tenant
    if (existing.customerId) {
      const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, existing.customerId), eq(customers.tenantId, tenantId))).limit(1);
      if (!custCheck) return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    if (!["Draft", "Sent"].includes(existing.status)) {
      return NextResponse.json(
        { error: "Cannot edit estimate in current status" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = updateEstimateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const lineItems = data.lineItems;

    if (lineItems) {
      const subtotal = lineItems.reduce(
        (sum, item) => sum + item.price * (item.quantity || 1),
        0
      );
      const taxRate = data.taxRate ?? existing.taxRate;
      const taxAmount = subtotal * (taxRate / 100);
      const discount = data.discount ?? existing.discount;
      const total = Math.max(0, subtotal + taxAmount - discount);

      // Delete existing line items
      await db.delete(estimateItems).where(eq(estimateItems.estimateId, params.id));

      // Update estimate
      await db
        .update(estimates)
        .set({
          ...(data.customerId && { customerId: data.customerId }),
          ...(data.vehicleId !== undefined && { vehicleId: data.vehicleId || null }),
          discount,
          taxRate,
          subtotal,
          total,
          ...(data.notes !== undefined && { notes: data.notes }),
          ...(data.validUntil !== undefined && {
            validUntil: data.validUntil ? new Date(data.validUntil).toISOString() : null,
          }),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(estimates.id, params.id));

      // Insert new line items
      await db.insert(estimateItems).values(
        lineItems.map((item) => ({
          estimateId: params.id,
          serviceId: item.serviceId || null,
          name: item.name,
          description: item.description || null,
          price: item.price,
          quantity: item.quantity || 1,
        }))
      );

      const result = await fetchEstimateWithRelations(db, params.id);
      return NextResponse.json(result);
    }

    // No line items — simple field update
    await db
      .update(estimates)
      .set({
        ...(data.discount !== undefined && { discount: data.discount }),
        ...(data.taxRate !== undefined && { taxRate: data.taxRate }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.validUntil !== undefined && {
          validUntil: data.validUntil ? new Date(data.validUntil).toISOString() : null,
        }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(estimates.id, params.id));

    const result = await fetchEstimateWithRelations(db, params.id);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session, tenantId } = auth;

    const { status } = await req.json();

    const db = getDb();

    const [existing] = await db.select().from(estimates).where(eq(estimates.id, params.id));
    if (!existing)
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });

    // Verify estimate's customer belongs to tenant
    if (existing.customerId) {
      const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, existing.customerId), eq(customers.tenantId, tenantId))).limit(1);
      if (!custCheck) return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    const validTransitions: Record<string, string[]> = {
      Draft: ["Sent"],
      Sent: ["Approved", "Declined", "Expired"],
      Approved: ["Converted"],
    };

    const allowed = validTransitions[existing.status] || [];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${existing.status} to ${status}` },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { status, updatedAt: new Date().toISOString() };
    if (status === "Sent") updateData.sentAt = new Date().toISOString();
    if (["Approved", "Declined"].includes(status))
      updateData.respondedAt = new Date().toISOString();

    await db.update(estimates).set(updateData).where(eq(estimates.id, params.id));

    const result = await fetchEstimateWithRelations(db, params.id);
    if (!result) return NextResponse.json({ error: "Estimate not found" }, { status: 404 });

    // Fire workflow triggers for estimate responses
    if (status === "Approved") {
      triggerWorkflows("estimate.accepted", {
        id: result.id,
        estimateNumber: result.estimateNumber,
        customerId: result.customer?.id,
        customerName: result.customer?.name,
        total: result.total,
      });
    }
    if (status === "Declined") {
      triggerWorkflows("estimate.declined", {
        id: result.id,
        estimateNumber: result.estimateNumber,
        customerId: result.customer?.id,
        customerName: result.customer?.name,
        total: result.total,
      });
    }

    // Create notification for estimate responses
    if (["Approved", "Declined"].includes(status)) {
      try {
        await db.insert(notifications).values({
          userId: session.user.id,
          type: "new_estimate_response",
          title: `Estimate ${status}`,
          message: `${result.customer?.name} ${status.toLowerCase()} estimate ${result.estimateNumber}`,
          link: `/estimates/${params.id}`,
        });
      } catch {}
    }

    return NextResponse.json(result);
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
    const { session, tenantId } = auth;

    // Only ADMIN/OWNER can delete estimates
    const role = session.user.role;
    if (role !== "ADMIN" && role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getDb();

    const [existing] = await db.select().from(estimates).where(eq(estimates.id, params.id));
    if (!existing)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Verify estimate's customer belongs to tenant
    if (existing.customerId) {
      const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, existing.customerId), eq(customers.tenantId, tenantId))).limit(1);
      if (!custCheck) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db
      .update(estimates)
      .set({ deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .where(eq(estimates.id, params.id));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
