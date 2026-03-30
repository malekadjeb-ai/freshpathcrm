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
  promoCodes,
} from "@/src/db/schema";
import { eq, and, isNull, desc, count, gte, lte, inArray } from "drizzle-orm";
import { createJobSchema } from "@/lib/validations/job";
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
    const location = searchParams.get("location") || "";
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const customerId = searchParams.get("customerId") || "";
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : null;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 500);

    // Pre-fetch tenant customer IDs for scoping
    const tenantCustomerRows = await db.select({ id: customers.id }).from(customers).where(eq(customers.tenantId, tenantId));
    const tenantCustomerIds = tenantCustomerRows.map(c => c.id);
    if (tenantCustomerIds.length === 0) {
      return NextResponse.json(page ? { data: [], pagination: { page, limit, total: 0, totalPages: 0 } } : []);
    }

    const conditions = [isNull(jobs.deletedAt), inArray(jobs.customerId, tenantCustomerIds)];
    if (status) conditions.push(eq(jobs.status, status));
    if (location) conditions.push(eq(jobs.location, location));
    if (customerId) conditions.push(eq(jobs.customerId, customerId));
    if (from) conditions.push(gte(jobs.scheduledAt, new Date(from).toISOString()));
    if (to) conditions.push(lte(jobs.scheduledAt, new Date(to).toISOString()));

    const whereClause = and(...conditions);

    const [totalRows, jobRows] = await Promise.all([
      db.select({ count: count() }).from(jobs).where(whereClause),
      db
        .select()
        .from(jobs)
        .where(whereClause)
        .orderBy(desc(jobs.scheduledAt))
        .limit(page ? limit : 500)
        .offset(page ? (page - 1) * limit : 0),
    ]);

    const total = totalRows[0].count;

    // Batch-query related data (no N+1)
    const jobIds = jobRows.map(j => j.id);
    const customerIds = [...new Set(jobRows.map(j => j.customerId))];
    const vehicleIds = [...new Set(jobRows.map(j => j.vehicleId).filter(Boolean))] as string[];

    const [allCustomers, allVehicles, allServices, allInvoices] = await Promise.all([
      customerIds.length
        ? db.select({ id: customers.id, name: customers.name, phone: customers.phone })
            .from(customers)
            .where(inArray(customers.id, customerIds))
        : Promise.resolve([]),
      vehicleIds.length
        ? db.select().from(vehicles).where(inArray(vehicles.id, vehicleIds))
        : Promise.resolve([]),
      jobIds.length
        ? db.select({
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
          .where(inArray(jobServices.jobId, jobIds))
        : Promise.resolve([]),
      jobIds.length
        ? db.select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber, status: invoices.status, jobId: invoices.jobId })
            .from(invoices)
            .where(inArray(invoices.jobId, jobIds))
        : Promise.resolve([]),
    ]);

    const customerMap = new Map(allCustomers.map(c => [c.id, c]));
    const vehicleMap = new Map(allVehicles.map(v => [v.id, v]));
    const servicesByJob = new Map<string, typeof allServices>();
    for (const s of allServices) {
      const list = servicesByJob.get(s.jobId) || [];
      list.push(s);
      servicesByJob.set(s.jobId, list);
    }
    const invoiceByJob = new Map(allInvoices.map(i => [i.jobId!, i]));

    const enriched = jobRows.map(job => ({
      ...job,
      customer: customerMap.get(job.customerId) ?? null,
      vehicle: job.vehicleId ? vehicleMap.get(job.vehicleId) ?? null : null,
      services: servicesByJob.get(job.id) ?? [],
      invoice: invoiceByJob.get(job.id) ?? null,
    }));

    if (page) {
      return NextResponse.json({
        data: enriched,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }
    return NextResponse.json(enriched);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const body = await req.json();
    const parsed = createJobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    const { customerId, vehicleId, services, scheduledAt, address, city, location,
      discount, discountType, notes, internalNotes, promoCodeId } = parsed.data;

    // Verify customer belongs to tenant
    const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const subtotal = services.reduce(
      (sum: number, s: { price: number; quantity: number }) => sum + s.price * s.quantity,
      0
    );
    const discountAmount =
      discountType === "percent" ? subtotal * ((discount || 0) / 100) : discount || 0;
    const total = Math.max(0, subtotal - discountAmount);

    const [newJob] = await db
      .insert(jobs)
      .values({
        customerId,
        vehicleId: vehicleId || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        address: address || null,
        city: city || null,
        location: location || "Richmond",
        subtotal,
        discount: discount || 0,
        discountType: discountType || "dollar",
        total,
        notes: notes || null,
        internalNotes: internalNotes || null,
        promoCodeId: promoCodeId || null,
        status: "Scheduled",
      })
      .returning();

    // Insert job services
    if (services.length > 0) {
      await db.insert(jobServices).values(
        services.map((s: { serviceItemId?: string; name?: string; price: number; quantity: number }) => ({
          jobId: newJob.id,
          serviceItemId: s.serviceItemId || null,
          name: s.name || null,
          price: s.price,
          quantity: s.quantity || 1,
        }))
      );
    }

    // Insert initial status history
    await db.insert(jobStatusHistory).values({
      jobId: newJob.id,
      fromStatus: null,
      toStatus: "Scheduled",
    });

    // Increment promo code usage
    if (promoCodeId) {
      try {
        const [promo] = await db.select({ usedCount: promoCodes.usedCount }).from(promoCodes).where(eq(promoCodes.id, promoCodeId));
        if (promo) {
          await db.update(promoCodes).set({ usedCount: promo.usedCount + 1 }).where(eq(promoCodes.id, promoCodeId));
        }
      } catch {}
    }

    // Fetch enriched job for response
    const [customerRows, vehicleRows, serviceRows] = await Promise.all([
      db.select({ id: customers.id, name: customers.name }).from(customers).where(eq(customers.id, customerId)),
      vehicleId ? db.select().from(vehicles).where(eq(vehicles.id, vehicleId)) : Promise.resolve([]),
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
        .where(eq(jobServices.jobId, newJob.id)),
    ]);

    const job = {
      ...newJob,
      customer: customerRows[0] ?? null,
      vehicle: vehicleRows[0] ?? null,
      services: serviceRows,
    };

    const jobData = {
      id: job.id,
      customerId: job.customerId,
      customerName: job.customer?.name,
      status: job.status,
      total: job.total,
      scheduledAt: job.scheduledAt,
    };
    fireWebhooks("job.created", jobData);
    triggerWorkflows("job.created", jobData);

    return NextResponse.json(job, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
