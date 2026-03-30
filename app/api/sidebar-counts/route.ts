import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { eq, and, isNull, gte, lt, count, inArray } from "drizzle-orm";
import { leads, tasks, jobs, customers } from "@/src/db/schema";

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    const todayEnd = new Date(new Date().setHours(23, 59, 59, 999)).toISOString();

    // Pre-fetch tenant customer IDs for job scoping
    const tenantCustRows = await db.select({ id: customers.id }).from(customers).where(eq(customers.tenantId, tenantId));
    const tenantCustIds = tenantCustRows.map(c => c.id);

    const [newLeadsResult, pendingTasksResult, todayJobsResult] = await Promise.all([
      db.select({ count: count() }).from(leads).where(and(eq(leads.tenantId, tenantId), eq(leads.status, "New"))),
      db.select({ count: count() }).from(tasks).where(eq(tasks.completed, false)),
      tenantCustIds.length
        ? db.select({ count: count() }).from(jobs).where(and(isNull(jobs.deletedAt), inArray(jobs.customerId, tenantCustIds), gte(jobs.scheduledAt, todayStart), lt(jobs.scheduledAt, todayEnd)))
        : Promise.resolve([{ count: 0 }]),
    ]);

    return NextResponse.json({
      newLeads: newLeadsResult[0].count,
      pendingTasks: pendingTasksResult[0].count,
      todayJobs: todayJobsResult[0].count,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
