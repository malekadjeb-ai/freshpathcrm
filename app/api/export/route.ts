import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { customers, jobs, invoices, leads, quotes, vehicles } from "@/src/db/schema";
import { eq, and, isNull, desc, asc, inArray } from "drizzle-orm";

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map(row =>
      headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return "";
        const str = String(val);
        if (str.includes(",") || str.includes("\n") || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(",")
    ),
  ];
  return lines.join("\n");
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const format = searchParams.get("format") || "csv";

    if (!type || !["customers", "jobs", "invoices", "leads", "quotes"].includes(type)) {
      return NextResponse.json({ error: "Invalid export type. Use: customers, jobs, invoices, leads, quotes" }, { status: 400 });
    }

    const db = getDb();
    let data: Record<string, unknown>[] = [];

    switch (type) {
      case "customers": {
        const rows = await db.select({
          name: customers.name,
          email: customers.email,
          phone: customers.phone,
          address: customers.address,
          city: customers.city,
          zip: customers.zip,
          source: customers.source,
          lifecycleStage: customers.lifecycleStage,
          healthScore: customers.healthScore,
          isCommercial: customers.isCommercial,
          companyName: customers.companyName,
          createdAt: customers.createdAt,
        }).from(customers).where(and(isNull(customers.deletedAt), eq(customers.tenantId, tenantId))).orderBy(asc(customers.name));
        data = rows.map(c => ({ ...c }));
        break;
      }
      case "jobs": {
        const tenantCustRows = await db.select({ id: customers.id }).from(customers).where(eq(customers.tenantId, tenantId));
        const tenantCustIds = tenantCustRows.map(c => c.id);
        const rows = tenantCustIds.length
          ? await db.select().from(jobs).where(and(isNull(jobs.deletedAt), inArray(jobs.customerId, tenantCustIds))).orderBy(desc(jobs.scheduledAt))
          : [];
        const jobCustomerIds = [...new Set(rows.map(j => j.customerId))];
        const jobVehicleIds = [...new Set(rows.filter(j => j.vehicleId).map(j => j.vehicleId!))];
        const [jobCustomerBatch, jobVehicleBatch] = await Promise.all([
          jobCustomerIds.length ? db.select({ id: customers.id, name: customers.name }).from(customers).where(inArray(customers.id, jobCustomerIds)) : Promise.resolve([]),
          jobVehicleIds.length ? db.select({ id: vehicles.id, year: vehicles.year, make: vehicles.make, model: vehicles.model }).from(vehicles).where(inArray(vehicles.id, jobVehicleIds)) : Promise.resolve([]),
        ]);
        const jobCustMap = new Map(jobCustomerBatch.map(c => [c.id, c]));
        const jobVehMap = new Map(jobVehicleBatch.map(v => [v.id, v]));
        data = rows.map((j) => {
          const customer = jobCustMap.get(j.customerId);
          const vehicle = j.vehicleId ? jobVehMap.get(j.vehicleId) : null;
          return {
            customer: customer?.name || "",
            vehicle: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "",
            status: j.status,
            scheduledAt: j.scheduledAt || "",
            completedAt: j.completedAt || "",
            location: j.location,
            subtotal: j.subtotal,
            discount: j.discount,
            total: j.total,
            tip: j.tip,
          };
        });
        break;
      }
      case "invoices": {
        const invTenantCustRows = await db.select({ id: customers.id }).from(customers).where(eq(customers.tenantId, tenantId));
        const invTenantCustIds = invTenantCustRows.map(c => c.id);
        const rows = invTenantCustIds.length
          ? await db.select().from(invoices).where(and(isNull(invoices.deletedAt), inArray(invoices.customerId, invTenantCustIds))).orderBy(desc(invoices.createdAt))
          : [];
        const invCustomerIds = [...new Set(rows.map(i => i.customerId))];
        const invCustomerBatch = invCustomerIds.length
          ? await db.select({ id: customers.id, name: customers.name }).from(customers).where(inArray(customers.id, invCustomerIds))
          : [];
        const invCustMap = new Map(invCustomerBatch.map(c => [c.id, c]));
        data = rows.map((i) => {
          const customer = invCustMap.get(i.customerId);
          return {
            invoiceNumber: i.invoiceNumber,
            customer: customer?.name || "",
            status: i.status,
            subtotal: i.subtotal,
            discount: i.discount,
            tax: i.tax,
            total: i.total,
            dueDate: i.dueDate || "",
            paidAt: i.paidAt || "",
            createdAt: i.createdAt,
          };
        });
        break;
      }
      case "leads": {
        const rows = await db.select().from(leads).where(eq(leads.tenantId, tenantId)).orderBy(desc(leads.createdAt));
        data = rows.map(l => ({
          name: l.name,
          phone: l.phone || "",
          email: l.email || "",
          source: l.source,
          status: l.status,
          vehicleInfo: l.vehicleInfo || "",
          estimatedValue: l.estimatedValue || "",
          city: l.city || "",
          createdAt: l.createdAt,
        }));
        break;
      }
      case "quotes": {
        // Pre-fetch tenant customer and lead IDs for scoping
        const qtCustRows = await db.select({ id: customers.id }).from(customers).where(eq(customers.tenantId, tenantId));
        const qtCustIds = qtCustRows.map(c => c.id);
        const qtLeadRows = await db.select({ id: leads.id }).from(leads).where(eq(leads.tenantId, tenantId));
        const qtLeadIds = qtLeadRows.map(l => l.id);

        const allQuotes = await db.select().from(quotes).orderBy(desc(quotes.createdAt));
        // Filter quotes to those belonging to tenant customers or leads
        const rows = allQuotes.filter(q =>
          (q.customerId && qtCustIds.includes(q.customerId)) ||
          (q.leadId && qtLeadIds.includes(q.leadId))
        );
        const quoteCustomerIds = [...new Set(rows.filter(q => q.customerId).map(q => q.customerId!))];
        const quoteLeadIds = [...new Set(rows.filter(q => q.leadId).map(q => q.leadId!))];
        const [quoteCustBatch, quoteLeadBatch] = await Promise.all([
          quoteCustomerIds.length ? db.select({ id: customers.id, name: customers.name }).from(customers).where(inArray(customers.id, quoteCustomerIds)) : Promise.resolve([]),
          quoteLeadIds.length ? db.select({ id: leads.id, name: leads.name }).from(leads).where(inArray(leads.id, quoteLeadIds)) : Promise.resolve([]),
        ]);
        const quoteCustMap = new Map(quoteCustBatch.map(c => [c.id, c]));
        const quoteLeadMap = new Map(quoteLeadBatch.map(l => [l.id, l]));
        data = rows.map((q) => {
          const customer = q.customerId ? quoteCustMap.get(q.customerId) : null;
          const lead = q.leadId ? quoteLeadMap.get(q.leadId) : null;
          return {
            quoteNumber: q.quoteNumber,
            customer: customer?.name || lead?.name || "",
            status: q.status,
            goodPrice: q.goodPrice,
            betterPrice: q.betterPrice,
            bestPrice: q.bestPrice,
            selectedTier: q.selectedTier || "",
            total: q.total,
            createdAt: q.createdAt,
          };
        });
        break;
      }
    }

    if (format === "json") {
      return NextResponse.json(data, {
        headers: {
          "Content-Disposition": `attachment; filename="${type}-export.json"`,
        },
      });
    }

    const csv = toCsv(data);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${type}-export.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
