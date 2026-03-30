import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import {
  invoices,
  jobs,
  customers,
  vehicles,
  jobServices,
  serviceItems,
  payments,
  businessSettings,
  jobStatusHistory,
} from "@/src/db/schema";
import { eq, and, isNull, lt, inArray, desc, sql } from "drizzle-orm";
import { addDays } from "date-fns";
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
    const customerId = searchParams.get("customerId") || "";
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : null;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 500);

    // Pre-fetch tenant customer IDs for scoping
    const tenantCustRows = await db.select({ id: customers.id }).from(customers).where(eq(customers.tenantId, tenantId));
    const tenantCustIds = tenantCustRows.map(c => c.id);

    // Auto-flag overdue invoices (scoped to tenant)
    if (tenantCustIds.length > 0) {
      await db
        .update(invoices)
        .set({ status: "Overdue", updatedAt: new Date().toISOString() })
        .where(
          and(
            isNull(invoices.deletedAt),
            eq(invoices.status, "Sent"),
            lt(invoices.dueDate, new Date().toISOString()),
            inArray(invoices.customerId, tenantCustIds)
          )
        );
    }

    if (tenantCustIds.length === 0) {
      return NextResponse.json(page ? { data: [], pagination: { page, limit, total: 0, totalPages: 0 } } : []);
    }

    // Build filter conditions
    const conditions = [isNull(invoices.deletedAt), inArray(invoices.customerId, tenantCustIds)];
    if (status) conditions.push(eq(invoices.status, status));
    if (customerId) conditions.push(eq(invoices.customerId, customerId));
    const whereClause = and(...conditions);

    // Fetch invoices
    const invoiceRows = await db
      .select()
      .from(invoices)
      .where(whereClause)
      .orderBy(desc(invoices.createdAt))
      .limit(page ? limit : 500)
      .offset(page ? (page - 1) * limit : 0);

    const total = page
      ? (
          await db
            .select({ count: sql<number>`count(*)` })
            .from(invoices)
            .where(whereClause)
        )[0].count
      : invoiceRows.length;

    // Fetch related data for each invoice
    const invoiceIds = invoiceRows.map((i) => i.id);
    const jobIds = invoiceRows.map((i) => i.jobId).filter(Boolean) as string[];

    const [allPayments, allJobs, allJobServices] = await Promise.all([
      invoiceIds.length
        ? db.select().from(payments).where(inArray(payments.invoiceId, invoiceIds))
        : [],
      jobIds.length
        ? db.select().from(jobs).where(inArray(jobs.id, jobIds))
        : [],
      jobIds.length
        ? db
            .select({
              id: jobServices.id,
              jobId: jobServices.jobId,
              serviceItemId: jobServices.serviceItemId,
              price: jobServices.price,
              quantity: jobServices.quantity,
              serviceItem: {
                id: serviceItems.id,
                name: serviceItems.name,
                description: serviceItems.description,
                basePrice: serviceItems.basePrice,
                category: serviceItems.category,
              },
            })
            .from(jobServices)
            .leftJoin(serviceItems, eq(jobServices.serviceItemId, serviceItems.id))
            .where(inArray(jobServices.jobId, jobIds))
        : [],
    ]);

    const customerIds = [...new Set(allJobs.map((j) => j.customerId))];
    const vehicleIds = [...new Set(allJobs.map((j) => j.vehicleId).filter(Boolean))] as string[];

    const [allCustomers, allVehicles] = await Promise.all([
      customerIds.length
        ? db
            .select({ id: customers.id, name: customers.name })
            .from(customers)
            .where(inArray(customers.id, customerIds))
        : [],
      vehicleIds.length
        ? db.select().from(vehicles).where(inArray(vehicles.id, vehicleIds))
        : [],
    ]);

    const customerMap = Object.fromEntries(allCustomers.map((c) => [c.id, c]));
    const vehicleMap = Object.fromEntries(allVehicles.map((v) => [v.id, v]));
    const jobMap = Object.fromEntries(
      allJobs.map((j) => [
        j.id,
        {
          ...j,
          customer: customerMap[j.customerId] || null,
          vehicle: j.vehicleId ? vehicleMap[j.vehicleId] || null : null,
          services: allJobServices.filter((s) => s.jobId === j.id),
        },
      ])
    );
    const paymentsMap: Record<string, { id: string; invoiceId: string; amount: number; method: string; paymentDate: string; notes: string | null; createdAt: string }[]> = {};
    for (const p of allPayments) {
      if (!paymentsMap[p.invoiceId]) paymentsMap[p.invoiceId] = [];
      paymentsMap[p.invoiceId].push(p);
    }

    const result = invoiceRows.map((inv) => ({
      ...inv,
      job: inv.jobId ? jobMap[inv.jobId] || null : null,
      payments: paymentsMap[inv.id] || [],
    }));

    if (page) {
      return NextResponse.json({
        data: result,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }
    return NextResponse.json(result);
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
    const { jobId, dueDate, notes, tax } = await req.json();
    if (!jobId) return NextResponse.json({ error: "Job ID required" }, { status: 400 });

    const job = (await db.select().from(jobs).where(eq(jobs.id, jobId)))[0];
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    // Verify job's customer belongs to tenant
    const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, job.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const existing = (
      await db.select().from(invoices).where(eq(invoices.jobId, jobId))
    )[0];
    if (existing) {
      const existingPayments = await db
        .select()
        .from(payments)
        .where(eq(payments.invoiceId, existing.id));
      return NextResponse.json({ ...existing, payments: existingPayments });
    }

    // Get settings for tax rate and payment terms
    const settings = (await db.select().from(businessSettings).where(eq(businessSettings.tenantId, tenantId)).limit(1))[0];
    const taxRate = tax ?? settings?.taxRate ?? 0;
    const taxAmount = Math.round(job.total * (taxRate / 100) * 100) / 100;
    const total = job.total + taxAmount;

    // Calculate due date from settings if not provided
    let calculatedDueDate: string | null = null;
    if (dueDate) {
      calculatedDueDate = new Date(dueDate).toISOString();
    } else if (settings?.defaultPaymentTerms) {
      const terms = settings.defaultPaymentTerms;
      if (terms === "Due on receipt") {
        calculatedDueDate = new Date().toISOString();
      } else if (terms === "Net 15") {
        calculatedDueDate = addDays(new Date(), 15).toISOString();
      } else if (terms === "Net 30") {
        calculatedDueDate = addDays(new Date(), 30).toISOString();
      }
    }

    // Get next invoice number
    const lastInvoice = (
      await db
        .select({ invoiceNumber: invoices.invoiceNumber })
        .from(invoices)
        .orderBy(desc(invoices.invoiceNumber))
        .limit(1)
    )[0];
    const lastNum = lastInvoice
      ? parseInt(lastInvoice.invoiceNumber.replace("FP-", ""), 10)
      : 0;
    const invoiceNumber = `FP-${String(lastNum + 1).padStart(4, "0")}`;

    // Create invoice
    const invoice = (
      await db
        .insert(invoices)
        .values({
          invoiceNumber,
          jobId,
          customerId: job.customerId,
          status: "Draft",
          subtotal: job.subtotal,
          discount: job.discount,
          tax: taxAmount,
          total,
          dueDate: calculatedDueDate,
          notes: notes || null,
        })
        .returning()
    )[0];

    // Update job status to Invoiced
    await db
      .update(jobs)
      .set({ status: "Invoiced", updatedAt: new Date().toISOString() })
      .where(eq(jobs.id, jobId));

    // Insert status history
    await db.insert(jobStatusHistory).values({
      jobId,
      fromStatus: job.status,
      toStatus: "Invoiced",
    });

    // Fetch full invoice with relations for response
    const invoiceJob = (await db.select().from(jobs).where(eq(jobs.id, jobId)))[0];
    const invoiceCustomer = (
      await db
        .select({ id: customers.id, name: customers.name })
        .from(customers)
        .where(eq(customers.id, job.customerId))
    )[0];
    const invoiceServices = await db
      .select({
        id: jobServices.id,
        jobId: jobServices.jobId,
        serviceItemId: jobServices.serviceItemId,
        price: jobServices.price,
        quantity: jobServices.quantity,
        serviceItem: {
          id: serviceItems.id,
          name: serviceItems.name,
          description: serviceItems.description,
          basePrice: serviceItems.basePrice,
          category: serviceItems.category,
        },
      })
      .from(jobServices)
      .leftJoin(serviceItems, eq(jobServices.serviceItemId, serviceItems.id))
      .where(eq(jobServices.jobId, jobId));

    const fullInvoice = {
      ...invoice,
      job: {
        ...invoiceJob,
        customer: invoiceCustomer,
        services: invoiceServices,
      },
      payments: [],
    };

    const invoiceData = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      jobId,
      total: invoice.total,
    };
    fireWebhooks("invoice.created", invoiceData);
    triggerWorkflows("invoice.created", invoiceData);

    return NextResponse.json(fullInvoice, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
