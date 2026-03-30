import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { workflows, workflowLogs } from "@/src/db/schema";
import { eq, desc } from "drizzle-orm";
import { workflowSchema } from "@/lib/validations/workflow";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const { id } = await params;

    const [workflow] = await db.select().from(workflows).where(eq(workflows.id, id));
    if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const logs = await db
      .select()
      .from(workflowLogs)
      .where(eq(workflowLogs.workflowId, id))
      .orderBy(desc(workflowLogs.createdAt))
      .limit(20);

    return NextResponse.json({
      ...workflow,
      trigger: JSON.parse(workflow.trigger),
      actions: JSON.parse(workflow.actions),
      logs: logs.map((l) => ({
        ...l,
        actions: JSON.parse(l.actions),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const { id } = await params;
    const body = await req.json();

    // Allow partial updates (just toggle isActive, etc.)
    if (body.isActive !== undefined && Object.keys(body).length === 1) {
      const [workflow] = await db
        .update(workflows)
        .set({ isActive: body.isActive, updatedAt: new Date().toISOString() })
        .where(eq(workflows.id, id))
        .returning();
      return NextResponse.json({
        ...workflow,
        trigger: JSON.parse(workflow.trigger),
        actions: JSON.parse(workflow.actions),
      });
    }

    const parsed = workflowSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, description, trigger, actions, isActive } = parsed.data;

    const [workflow] = await db
      .update(workflows)
      .set({
        name,
        description: description || null,
        trigger: JSON.stringify(trigger),
        actions: JSON.stringify(actions),
        isActive: isActive ?? true,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(workflows.id, id))
      .returning();

    return NextResponse.json({
      ...workflow,
      trigger: JSON.parse(workflow.trigger),
      actions: JSON.parse(workflow.actions),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const { id } = await params;
    await db.delete(workflows).where(eq(workflows.id, id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
