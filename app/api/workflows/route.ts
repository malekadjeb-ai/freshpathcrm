import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { workflows, workflowLogs } from "@/src/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { workflowSchema } from "@/lib/validations/workflow";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const isTemplate = searchParams.get("templates") === "true";
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : null;
    const limit = Math.min(parseInt(searchParams.get("limit") || "25"), 100);

    let allWorkflows;
    if (isTemplate) {
      allWorkflows = await db.select().from(workflows).where(eq(workflows.isTemplate, true)).orderBy(desc(workflows.updatedAt));
    } else {
      allWorkflows = await db.select().from(workflows).orderBy(desc(workflows.updatedAt));
    }

    // Get log counts for each workflow
    const logCounts = await db
      .select({ workflowId: workflowLogs.workflowId, count: count() })
      .from(workflowLogs)
      .groupBy(workflowLogs.workflowId);

    const logCountMap = new Map(logCounts.map((l) => [l.workflowId, l.count]));

    const parsed = allWorkflows.map((w) => ({
      ...w,
      trigger: JSON.parse(w.trigger),
      actions: JSON.parse(w.actions),
      logCount: logCountMap.get(w.id) ?? 0,
    }));

    if (page) {
      const total = parsed.length;
      const paginatedResult = parsed.slice((page - 1) * limit, page * limit);
      return NextResponse.json({
        data: paginatedResult,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    const db = getDb();
    const body = await req.json();
    const parsed = workflowSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, description, trigger, actions, isActive } = parsed.data;

    const [workflow] = await db.insert(workflows).values({
      name,
      description: description || null,
      trigger: JSON.stringify(trigger),
      actions: JSON.stringify(actions),
      isActive: isActive ?? true,
      isTemplate: body.isTemplate ?? false,
    }).returning();

    return NextResponse.json({
      ...workflow,
      trigger: JSON.parse(workflow.trigger),
      actions: JSON.parse(workflow.actions),
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
