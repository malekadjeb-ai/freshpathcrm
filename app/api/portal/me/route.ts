import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/src/db";
import { customers, portalSessions, vehicles, jobs, jobServices, serviceItems, invoices, payments, subscriptions, servicePlans } from "@/src/db/schema";
import { eq, and, gte, desc, isNull, inArray } from "drizzle-orm";

async function getPortalCustomer(req: NextRequest) {
  const token = req.cookies.get("portal-session")?.value;
  if (!token) return null;

  const db = getDb();
  const session = await db.select().from(portalSessions).where(
    and(
      eq(portalSessions.token, token),
      gte(portalSessions.expiresAt, new Date().toISOString())
    )
  ).limit(1).then(r => r[0]);

  if (!session) return null;

  const customer = await db.select().from(customers).where(eq(customers.id, session.customerId)).limit(1).then(r => r[0]);

  // Update last active
  await db.update(portalSessions).set({ lastActive: new Date().toISOString() }).where(eq(portalSessions.id, session.id));

  return customer ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const customer = await getPortalCustomer(req);
    if (!customer) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const db = getDb();

    const [customerVehicles, customerJobs, customerInvoices, customerSubscriptions] = await Promise.all([
      db.select().from(vehicles).where(eq(vehicles.customerId, customer.id)),
      db.select().from(jobs)
        .where(and(eq(jobs.customerId, customer.id), isNull(jobs.deletedAt)))
        .orderBy(desc(jobs.scheduledAt))
        .limit(10),
      db.select().from(invoices)
        .where(and(eq(invoices.customerId, customer.id), isNull(invoices.deletedAt)))
        .orderBy(desc(invoices.createdAt))
        .limit(10),
      db.select().from(subscriptions).where(eq(subscriptions.customerId, customer.id)),
    ]);

    // Batch: fetch all services, invoices, payments, plans, and vehicles
    const portalJobIds = customerJobs.map(j => j.id);
    const portalInvIds = customerInvoices.map(i => i.id);
    const portalSubPlanIds = [...new Set(customerSubscriptions.map(s => s.planId))];
    const portalSubVehIds = [...new Set(customerSubscriptions.filter(s => s.vehicleId).map(s => s.vehicleId!))];

    const [portalJobSvcs, portalJobInvoices, portalPlans, portalSubVehicles] = await Promise.all([
      portalJobIds.length ? db.select({ jobService: jobServices, serviceItem: serviceItems }).from(jobServices).leftJoin(serviceItems, eq(jobServices.serviceItemId, serviceItems.id)).where(inArray(jobServices.jobId, portalJobIds)) : Promise.resolve([]),
      portalJobIds.length ? db.select().from(invoices).where(inArray(invoices.jobId, portalJobIds)) : Promise.resolve([]),
      portalSubPlanIds.length ? db.select().from(servicePlans).where(inArray(servicePlans.id, portalSubPlanIds)) : Promise.resolve([]),
      portalSubVehIds.length ? db.select().from(vehicles).where(inArray(vehicles.id, portalSubVehIds)) : Promise.resolve([]),
    ]);

    const portalJobSvcMap = new Map<string, (typeof portalJobSvcs)[number][]>();
    for (const js of portalJobSvcs) {
      const jId = js.jobService.jobId;
      if (!portalJobSvcMap.has(jId)) portalJobSvcMap.set(jId, []);
      portalJobSvcMap.get(jId)!.push(js);
    }
    const portalJobInvMap = new Map(portalJobInvoices.map(i => [i.jobId, i]));

    // Collect all invoice IDs from both direct invoices and job-linked invoices
    const allPortalInvIds = [...new Set([...portalInvIds, ...portalJobInvoices.map(i => i.id)])];
    const allPortalPayments = allPortalInvIds.length
      ? await db.select().from(payments).where(inArray(payments.invoiceId, allPortalInvIds))
      : [];
    const portalPaymentMap = new Map<string, (typeof allPortalPayments)[number][]>();
    for (const p of allPortalPayments) {
      if (!portalPaymentMap.has(p.invoiceId)) portalPaymentMap.set(p.invoiceId, []);
      portalPaymentMap.get(p.invoiceId)!.push(p);
    }

    const portalPlanMap = new Map(portalPlans.map(p => [p.id, p]));
    const portalSubVehMap = new Map(portalSubVehicles.map(v => [v.id, v]));

    const enrichedJobs = customerJobs.map((job) => {
      const jobSvcs = portalJobSvcMap.get(job.id) || [];
      const jobInvoice = portalJobInvMap.get(job.id) ?? null;
      const invoiceWithPayments = jobInvoice
        ? { ...jobInvoice, payments: portalPaymentMap.get(jobInvoice.id) || [] }
        : null;
      return { ...job, services: jobSvcs, invoice: invoiceWithPayments };
    });

    const enrichedInvoices = customerInvoices.map((inv) => ({
      ...inv,
      payments: portalPaymentMap.get(inv.id) || [],
    }));

    const enrichedSubscriptions = customerSubscriptions.map((sub) => ({
      ...sub,
      plan: portalPlanMap.get(sub.planId) ?? undefined,
      vehicle: sub.vehicleId ? portalSubVehMap.get(sub.vehicleId) ?? null : null,
    }));

    return NextResponse.json({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      vehicles: customerVehicles,
      upcomingJobs: enrichedJobs.filter((j) => ["Scheduled", "EnRoute"].includes(j.status)),
      completedJobs: enrichedJobs.filter((j) => j.status === "Completed" || j.status === "Paid"),
      invoices: enrichedInvoices,
      subscriptions: enrichedSubscriptions,
    });
  } catch (error) {
    console.error("Portal me error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}
