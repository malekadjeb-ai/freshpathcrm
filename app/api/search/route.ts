import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { eq, and, or, isNull, like, inArray } from "drizzle-orm";
import { customers, leads, jobs, invoices, estimates, tasks, staff, serviceItems } from "@/src/db/schema";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    if (q.length < 2) return NextResponse.json({ customers: [], jobs: [], invoices: [], leads: [], estimates: [], tasks: [], staff: [], services: [] });

    const db = getDb();
    const pattern = `%${q}%`;

    const [
      customersRows,
      leadsRows,
      jobsRows,
      invoicesRows,
      estimatesRows,
      tasksRows,
      staffRows,
      servicesRows,
    ] = await Promise.all([
      db.select({ id: customers.id, name: customers.name, email: customers.email, phone: customers.phone })
        .from(customers)
        .where(and(isNull(customers.deletedAt), eq(customers.tenantId, tenantId), or(like(customers.name, pattern), like(customers.email, pattern), like(customers.phone, pattern))))
        .limit(5),

      db.select({ id: leads.id, name: leads.name, status: leads.status, phone: leads.phone })
        .from(leads)
        .where(and(eq(leads.tenantId, tenantId), or(like(leads.name, pattern), like(leads.phone, pattern), like(leads.email, pattern))))
        .limit(5),

      db.select({
        id: jobs.id,
        status: jobs.status,
        total: jobs.total,
        scheduledAt: jobs.scheduledAt,
        customerName: customers.name,
      })
        .from(jobs)
        .leftJoin(customers, eq(jobs.customerId, customers.id))
        .where(and(isNull(jobs.deletedAt), or(like(customers.name, pattern), like(jobs.notes, pattern))))
        .limit(5),

      db.select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        total: invoices.total,
        customerName: customers.name,
      })
        .from(invoices)
        .leftJoin(jobs, eq(invoices.jobId, jobs.id))
        .leftJoin(customers, eq(jobs.customerId, customers.id))
        .where(and(isNull(invoices.deletedAt), or(like(invoices.invoiceNumber, pattern), like(customers.name, pattern))))
        .limit(5),

      db.select({
        id: estimates.id,
        estimateNumber: estimates.estimateNumber,
        total: estimates.total,
        customerName: customers.name,
      })
        .from(estimates)
        .leftJoin(customers, eq(estimates.customerId, customers.id))
        .where(and(isNull(estimates.deletedAt), or(like(estimates.estimateNumber, pattern), like(customers.name, pattern))))
        .limit(5),

      db.select({ id: tasks.id, title: tasks.title, priority: tasks.priority })
        .from(tasks)
        .where(or(like(tasks.title, pattern), like(tasks.description, pattern)))
        .limit(5),

      db.select({ id: staff.id, name: staff.name, role: staff.role, isActive: staff.isActive })
        .from(staff)
        .where(and(eq(staff.tenantId, tenantId), or(like(staff.name, pattern), like(staff.email, pattern), like(staff.phone, pattern))))
        .limit(5),

      db.select({ id: serviceItems.id, name: serviceItems.name, basePrice: serviceItems.basePrice, category: serviceItems.category })
        .from(serviceItems)
        .where(and(eq(serviceItems.tenantId, tenantId), or(like(serviceItems.name, pattern), like(serviceItems.description, pattern))))
        .limit(5),
    ]);

    return NextResponse.json({
      customers: customersRows,
      leads: leadsRows,
      jobs: jobsRows.map(({ customerName, ...r }) => ({ ...r, customer: { name: customerName } })),
      invoices: invoicesRows.map(({ customerName, ...r }) => ({ ...r, job: { customer: { name: customerName } } })),
      estimates: estimatesRows.map(({ customerName, ...r }) => ({ ...r, customer: { name: customerName } })),
      tasks: tasksRows,
      staff: staffRows,
      services: servicesRows,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
