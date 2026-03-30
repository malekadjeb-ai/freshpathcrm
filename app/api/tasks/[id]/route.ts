import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { tasks, customers, leads } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";
import { taskSchema } from "@/lib/validations/task";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();

    // Verify task belongs to tenant's customer/lead
    const [existingTask] = await db.select().from(tasks).where(eq(tasks.id, params.id));
    if (!existingTask) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existingTask.customerId) {
      const [c] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, existingTask.customerId), eq(customers.tenantId, tenantId))).limit(1);
      if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (existingTask.leadId) {
      const [l] = await db.select({ id: leads.id }).from(leads).where(and(eq(leads.id, existingTask.leadId), eq(leads.tenantId, tenantId))).limit(1);
      if (!l) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = taskSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = { ...data, updatedAt: new Date().toISOString() };

    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate).toISOString() : null;
    }

    if (data.completed === true) {
      updateData.completedAt = new Date().toISOString();
    } else if (data.completed === false) {
      updateData.completedAt = null;
    }

    const [task] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, params.id))
      .returning();

    return NextResponse.json(task);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();

    // Verify task belongs to tenant's customer/lead
    const [existingDel] = await db.select().from(tasks).where(eq(tasks.id, params.id));
    if (!existingDel) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existingDel.customerId) {
      const [c] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, existingDel.customerId), eq(customers.tenantId, tenantId))).limit(1);
      if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (existingDel.leadId) {
      const [l] = await db.select({ id: leads.id }).from(leads).where(and(eq(leads.id, existingDel.leadId), eq(leads.tenantId, tenantId))).limit(1);
      if (!l) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.delete(tasks).where(eq(tasks.id, params.id));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
