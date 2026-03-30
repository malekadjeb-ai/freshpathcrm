import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { estimates, estimateItems, customers, vehicles, serviceItems } from "@/src/db/schema";
import { eq, and, desc, isNull, inArray } from "drizzle-orm";
import { createEstimateSchema } from "@/lib/validations/estimate";
import { fireWebhooks } from "@/lib/webhooks";
import { triggerWorkflows } from "@/lib/services/workflow-engine";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";

    // Build conditions - scope through customer tenant
    const conditions = [isNull(estimates.deletedAt), eq(customers.tenantId, tenantId)];
    if (status) conditions.push(eq(estimates.status, status));

    const where = and(...conditions);

    // Fetch estimates with customer join for search
    const rows = await db
      .select({
        id: estimates.id,
        estimateNumber: estimates.estimateNumber,
        customerId: estimates.customerId,
        leadId: estimates.leadId,
        vehicleId: estimates.vehicleId,
        status: estimates.status,
        subtotal: estimates.subtotal,
        discount: estimates.discount,
        taxRate: estimates.taxRate,
        total: estimates.total,
        notes: estimates.notes,
        validUntil: estimates.validUntil,
        sentAt: estimates.sentAt,
        respondedAt: estimates.respondedAt,
        convertedJobId: estimates.convertedJobId,
        createdAt: estimates.createdAt,
        updatedAt: estimates.updatedAt,
        deletedAt: estimates.deletedAt,
        customer: {
          id: customers.id,
          name: customers.name,
          phone: customers.phone,
          email: customers.email,
        },
      })
      .from(estimates)
      .leftJoin(customers, eq(estimates.customerId, customers.id))
      .where(where)
      .orderBy(desc(estimates.createdAt));

    // Filter by search in JS (estimate number or customer name)
    const filtered = search
      ? rows.filter(
          (r) =>
            r.estimateNumber.toLowerCase().includes(search.toLowerCase()) ||
            (r.customer?.name ?? "").toLowerCase().includes(search.toLowerCase())
        )
      : rows;

    // Batch: fetch all vehicles and line items for filtered estimates
    const vehicleIds = [...new Set(filtered.filter(e => e.vehicleId).map(e => e.vehicleId!))];
    const estimateIds = filtered.map(e => e.id);

    const [vehicleBatch, lineItemsBatch] = await Promise.all([
      vehicleIds.length
        ? db.select().from(vehicles).where(inArray(vehicles.id, vehicleIds))
        : Promise.resolve([]),
      estimateIds.length
        ? db.select({
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
          .where(inArray(estimateItems.estimateId, estimateIds))
        : Promise.resolve([]),
    ]);

    const vehicleMap = new Map(vehicleBatch.map(v => [v.id, v]));
    const lineItemsMap = new Map<string, (typeof lineItemsBatch)[number][]>();
    for (const li of lineItemsBatch) {
      if (!lineItemsMap.has(li.estimateId)) lineItemsMap.set(li.estimateId, []);
      lineItemsMap.get(li.estimateId)!.push(li);
    }

    const result = filtered.map((est) => ({
      ...est,
      vehicle: est.vehicleId ? vehicleMap.get(est.vehicleId) ?? null : null,
      lineItems: lineItemsMap.get(est.id) || [],
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const body = await req.json();
    const parsed = createEstimateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const db = getDb();
    const data = parsed.data;

    // Verify customer belongs to tenant
    const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, data.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    const subtotal = data.lineItems.reduce(
      (sum, item) => sum + item.price * (item.quantity || 1),
      0
    );
    const taxAmount = subtotal * ((data.taxRate || 0) / 100);
    const total = Math.max(0, subtotal + taxAmount - (data.discount || 0));

    // Generate estimate number
    const lastEstimate = await db
      .select({ estimateNumber: estimates.estimateNumber })
      .from(estimates)
      .orderBy(desc(estimates.estimateNumber))
      .limit(1)
      .then((r) => r[0] ?? null);

    const lastNum = lastEstimate
      ? parseInt(lastEstimate.estimateNumber.replace("EST-", ""), 10)
      : 0;
    const estimateNumber = `EST-${String(lastNum + 1).padStart(4, "0")}`;

    // Create estimate
    const [estimate] = await db
      .insert(estimates)
      .values({
        estimateNumber,
        customerId: data.customerId,
        vehicleId: data.vehicleId || null,
        discount: data.discount || 0,
        taxRate: data.taxRate || 0,
        subtotal,
        total,
        notes: data.notes || null,
        validUntil: data.validUntil ? new Date(data.validUntil).toISOString() : null,
      })
      .returning();

    // Insert line items
    await db.insert(estimateItems).values(
      data.lineItems.map((item) => ({
        estimateId: estimate.id,
        serviceId: item.serviceId || null,
        name: item.name,
        description: item.description || null,
        price: item.price,
        quantity: item.quantity || 1,
      }))
    );

    // Fetch customer and related data for response
    const customer = await db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(eq(customers.id, estimate.customerId))
      .then((r) => r[0] ?? null);

    const vehicle = estimate.vehicleId
      ? await db
          .select()
          .from(vehicles)
          .where(eq(vehicles.id, estimate.vehicleId))
          .then((r) => r[0] ?? null)
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
      .where(eq(estimateItems.estimateId, estimate.id));

    const result = { ...estimate, customer, vehicle, lineItems };

    const estimateData = {
      id: result.id,
      estimateNumber: result.estimateNumber,
      customerId: customer?.id,
      customerName: customer?.name,
      total: result.total,
    };
    fireWebhooks("estimate.created", estimateData);
    triggerWorkflows("estimate.created", estimateData);

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
