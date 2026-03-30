import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { activities, customers, leads } from "@/src/db/schema";
import { eq, lte, and, inArray, or, isNull } from "drizzle-orm";
import { asc } from "drizzle-orm";

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // Pre-fetch tenant customer and lead IDs for scoping
    const [tenantCustRows, tenantLeadRows] = await Promise.all([
      db.select({ id: customers.id }).from(customers).where(eq(customers.tenantId, tenantId)),
      db.select({ id: leads.id }).from(leads).where(eq(leads.tenantId, tenantId)),
    ]);
    const tenantCustIds = tenantCustRows.map(c => c.id);
    const tenantLeadIds = tenantLeadRows.map(l => l.id);

    // Scope follow-ups to tenant's customers/leads
    const scopeConditions = [];
    if (tenantCustIds.length > 0) scopeConditions.push(inArray(activities.customerId, tenantCustIds));
    if (tenantLeadIds.length > 0) scopeConditions.push(inArray(activities.leadId, tenantLeadIds));
    scopeConditions.push(and(isNull(activities.customerId), isNull(activities.leadId)));

    const allFollowUps = await db
      .select()
      .from(activities)
      .where(
        and(
          lte(activities.followUpDate, endOfToday.toISOString()),
          eq(activities.followUpDone, false),
          or(...scopeConditions)
        )
      )
      .orderBy(asc(activities.followUpDate));

    // Batch: fetch all related customers and leads
    const customerIds = [...new Set(allFollowUps.filter(a => a.customerId).map(a => a.customerId!))];
    const leadIds = [...new Set(allFollowUps.filter(a => a.leadId).map(a => a.leadId!))];

    const [customerBatch, leadBatch] = await Promise.all([
      customerIds.length ? db.select({ id: customers.id, name: customers.name, phone: customers.phone }).from(customers).where(inArray(customers.id, customerIds)) : Promise.resolve([]),
      leadIds.length ? db.select({ id: leads.id, name: leads.name, phone: leads.phone }).from(leads).where(inArray(leads.id, leadIds)) : Promise.resolve([]),
    ]);

    const customerMap = new Map(customerBatch.map(c => [c.id, c]));
    const leadMap = new Map(leadBatch.map(l => [l.id, l]));

    const enriched = allFollowUps.map((activity) => ({
      ...activity,
      customer: activity.customerId ? customerMap.get(activity.customerId) ?? null : null,
      lead: activity.leadId ? leadMap.get(activity.leadId) ?? null : null,
    }));

    return NextResponse.json(enriched);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
