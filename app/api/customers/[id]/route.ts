import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { eq, and, isNull, desc, inArray } from "drizzle-orm";
import {
  customers,
  customerNotes,
  customerTags,
  tags,
  vehicles,
  jobs,
  jobServices,
  serviceItems,
  invoices,
} from "@/src/db/schema";
import { customerSchema } from "@/lib/validations/customer";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { tenantId } = auth;

    const db = getDb();
    const id = params.id;

    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
      .limit(1);

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Fetch related data in parallel
    const [
      customerTagRows,
      customerVehicles,
      customerNoteRows,
      referredByRow,
      referralRows,
      customerJobs,
    ] = await Promise.all([
      db
        .select({ tag: tags })
        .from(tags)
        .innerJoin(customerTags, and(eq(tags.id, customerTags.tagId), eq(customerTags.customerId, id))),
      db.select().from(vehicles).where(eq(vehicles.customerId, id)),
      db
        .select()
        .from(customerNotes)
        .where(eq(customerNotes.customerId, id))
        .orderBy(desc(customerNotes.createdAt)),
      customer.referredById
        ? db
            .select({ id: customers.id, name: customers.name })
            .from(customers)
            .where(eq(customers.id, customer.referredById))
            .limit(1)
        : Promise.resolve([]),
      db
        .select({ id: customers.id, name: customers.name })
        .from(customers)
        .where(eq(customers.referredById, id)),
      db
        .select()
        .from(jobs)
        .where(and(eq(jobs.customerId, id), isNull(jobs.deletedAt)))
        .orderBy(desc(jobs.scheduledAt)),
    ]);

    // Batch: fetch all services and invoices for all customer jobs at once
    const customerJobIds = customerJobs.map(j => j.id);
    const [allJobServicesRows, allInvoiceRows] = await Promise.all([
      customerJobIds.length
        ? db.select({ jobService: jobServices, serviceItem: serviceItems })
            .from(jobServices)
            .innerJoin(serviceItems, eq(jobServices.serviceItemId, serviceItems.id))
            .where(inArray(jobServices.jobId, customerJobIds))
        : Promise.resolve([]),
      customerJobIds.length
        ? db.select().from(invoices).where(inArray(invoices.jobId, customerJobIds))
        : Promise.resolve([]),
    ]);

    const jobServicesMap = new Map<string, (typeof allJobServicesRows)[number][]>();
    for (const r of allJobServicesRows) {
      const jobId = r.jobService.jobId;
      if (!jobServicesMap.has(jobId)) jobServicesMap.set(jobId, []);
      jobServicesMap.get(jobId)!.push(r);
    }
    const invoiceByJobMap = new Map(allInvoiceRows.map(i => [i.jobId, i]));

    const jobsWithRelations = customerJobs.map((job) => {
      const vehicle = customerVehicles.find((v) => v.id === job.vehicleId) ?? null;
      const svcRows = jobServicesMap.get(job.id) || [];
      return {
        ...job,
        vehicle,
        services: svcRows.map((r) => ({ ...r.jobService, serviceItem: r.serviceItem })),
        invoice: invoiceByJobMap.get(job.id) ?? null,
      };
    });

    const totalSpent = jobsWithRelations.reduce((sum, j) => sum + j.total, 0);

    return NextResponse.json({
      ...customer,
      tags: customerTagRows.map((r) => r.tag),
      vehicles: customerVehicles,
      notes: customerNoteRows,
      referredBy: referredByRow[0] ?? null,
      referrals: referralRows,
      jobs: jobsWithRelations,
      totalSpent,
      source: customer.source,
      sourceDetail: customer.sourceDetail,
      lifecycleStage: customer.lifecycleStage,
      healthScore: customer.healthScore,
      lastContactedAt: customer.lastContactedAt,
      lastJobAt: customer.lastJobAt,
      preferredContact: customer.preferredContact,
      birthday: customer.birthday,
      gateCode: customer.gateCode,
      specialInstructions: customer.specialInstructions,
      isCommercial: customer.isCommercial,
      companyName: customer.companyName,
      taxId: customer.taxId,
      billingEmail: customer.billingEmail,
      billingContact: customer.billingContact,
      paymentTerms: customer.paymentTerms,
      fleetSize: customer.fleetSize,
      fleetDiscount: customer.fleetDiscount,
      contractNotes: customer.contractNotes,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { tenantId } = auth;

    const db = getDb();
    const id = params.id;

    // Verify record exists and belongs to tenant
    const [existing] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
      .limit(1);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const data = customerSchema.parse(body);

    const [customer] = await db
      .update(customers)
      .set({
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        zip: data.zip || null,
        neighborhood: data.neighborhood || null,
        referredById: data.referredById || null,
        ...(data.phoneCarrier !== undefined && { phoneCarrier: data.phoneCarrier || null }),
        ...(data.source !== undefined && { source: data.source || null }),
        ...(data.sourceDetail !== undefined && { sourceDetail: data.sourceDetail || null }),
        ...(data.preferredContact !== undefined && { preferredContact: data.preferredContact || "text" }),
        ...(data.birthday !== undefined && { birthday: data.birthday || null }),
        ...(data.gateCode !== undefined && { gateCode: data.gateCode || null }),
        ...(data.specialInstructions !== undefined && { specialInstructions: data.specialInstructions || null }),
        ...(data.isCommercial !== undefined && { isCommercial: data.isCommercial }),
        ...(data.companyName !== undefined && { companyName: data.companyName || null }),
        ...(data.taxId !== undefined && { taxId: data.taxId || null }),
        ...(data.billingEmail !== undefined && { billingEmail: data.billingEmail || null }),
        ...(data.billingContact !== undefined && { billingContact: data.billingContact || null }),
        ...(data.paymentTerms !== undefined && { paymentTerms: data.paymentTerms || null }),
        ...(data.fleetSize !== undefined && { fleetSize: data.fleetSize }),
        ...(data.fleetDiscount !== undefined && { fleetDiscount: data.fleetDiscount }),
        ...(data.contractNotes !== undefined && { contractNotes: data.contractNotes || null }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(customers.id, id))
      .returning();

    // Replace tags: delete existing then insert new
    await db.delete(customerTags).where(eq(customerTags.customerId, id));
    if (data.tagIds?.length) {
      await db.insert(customerTags).values(
        data.tagIds.map((tagId) => ({ customerId: id, tagId }))
      );
    }

    // Fetch updated tags and vehicles for response
    const [customerTagRows, customerVehicles] = await Promise.all([
      db
        .select({ tag: tags })
        .from(tags)
        .innerJoin(customerTags, and(eq(tags.id, customerTags.tagId), eq(customerTags.customerId, id))),
      db.select().from(vehicles).where(eq(vehicles.customerId, id)),
    ]);

    return NextResponse.json({
      ...customer,
      tags: customerTagRows.map((r) => r.tag),
      vehicles: customerVehicles,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session, tenantId } = auth;

    // Only ADMIN/OWNER can delete customers
    const role = session.user.role;
    if (role !== "ADMIN" && role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getDb();
    const id = params.id;

    // Verify record exists and belongs to tenant
    const [existing] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
      .limit(1);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db
      .update(customers)
      .set({ deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .where(eq(customers.id, id));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
