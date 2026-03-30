import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { tasks, customers, jobs, leads } from "@/src/db/schema";
import { eq, asc, desc, and, or, inArray, isNull } from "drizzle-orm";
import { taskSchema } from "@/lib/validations/task";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const completed = searchParams.get("completed");
    const customerId = searchParams.get("customerId");
    const priority = searchParams.get("priority");

    // Pre-fetch tenant customer and lead IDs for scoping
    const [tenantCustRows, tenantLeadRows] = await Promise.all([
      db.select({ id: customers.id }).from(customers).where(eq(customers.tenantId, tenantId)),
      db.select({ id: leads.id }).from(leads).where(eq(leads.tenantId, tenantId)),
    ]);
    const tenantCustIds = tenantCustRows.map(c => c.id);
    const tenantLeadIds = tenantLeadRows.map(l => l.id);

    // Scope tasks to tenant's customers/leads
    const scopeConditions = [];
    if (tenantCustIds.length > 0) scopeConditions.push(inArray(tasks.customerId, tenantCustIds));
    if (tenantLeadIds.length > 0) scopeConditions.push(inArray(tasks.leadId, tenantLeadIds));
    // Also include tasks with no customer/lead (general tasks)
    scopeConditions.push(and(isNull(tasks.customerId), isNull(tasks.leadId)));

    const conditions = [or(...scopeConditions)!];
    if (completed === "true") conditions.push(eq(tasks.completed, true));
    else if (completed === "false") conditions.push(eq(tasks.completed, false));
    if (customerId) conditions.push(eq(tasks.customerId, customerId));
    if (priority) conditions.push(eq(tasks.priority, priority));

    const allTasks = await db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(asc(tasks.completed), asc(tasks.dueDate), desc(tasks.priority));

    // Batch: fetch all related customers and jobs
    const taskCustomerIds = [...new Set(allTasks.filter(t => t.customerId).map(t => t.customerId!))];
    const taskJobIds = [...new Set(allTasks.filter(t => t.jobId).map(t => t.jobId!))];

    const [taskCustBatch, taskJobBatch] = await Promise.all([
      taskCustomerIds.length ? db.select({ id: customers.id, name: customers.name }).from(customers).where(inArray(customers.id, taskCustomerIds)) : Promise.resolve([]),
      taskJobIds.length ? db.select({ id: jobs.id, status: jobs.status, scheduledAt: jobs.scheduledAt }).from(jobs).where(inArray(jobs.id, taskJobIds)) : Promise.resolve([]),
    ]);

    const taskCustMap = new Map(taskCustBatch.map(c => [c.id, c]));
    const taskJobMap = new Map(taskJobBatch.map(j => [j.id, j]));

    const enriched = allTasks.map((task) => ({
      ...task,
      customer: task.customerId ? taskCustMap.get(task.customerId) ?? null : null,
      job: task.jobId ? taskJobMap.get(task.jobId) ?? null : null,
    }));

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
    const parsed = taskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verify customer/lead belongs to tenant
    if (data.customerId) {
      const [c] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, data.customerId), eq(customers.tenantId, tenantId))).limit(1);
      if (!c) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    if (data.leadId) {
      const [l] = await db.select({ id: leads.id }).from(leads).where(and(eq(leads.id, data.leadId), eq(leads.tenantId, tenantId))).limit(1);
      if (!l) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const [task] = await db.insert(tasks).values({
      title: data.title,
      description: data.description,
      type: data.type,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      dueTime: data.dueTime,
      priority: data.priority || "medium",
      customerId: data.customerId,
      jobId: data.jobId,
      leadId: data.leadId,
    }).returning();

    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
