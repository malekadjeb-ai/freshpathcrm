import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { jobChecklists, jobs } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { updateJobChecklistSchema } from "@/lib/validations/checklist";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; checklistId: string } }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    const db = getDb();
    const body = await req.json();
    const parsed = updateJobChecklistSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    const allChecked = parsed.data.items.every((item) => !item.required || item.checked);

    const [updated] = await db
      .update(jobChecklists)
      .set({
        items: JSON.stringify(parsed.data.items),
        completedAt: allChecked ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(jobChecklists.id, params.checklistId))
      .returning();

    // Update job checklistComplete flag
    const allJobChecklists = await db
      .select()
      .from(jobChecklists)
      .where(eq(jobChecklists.jobId, params.id));

    const allComplete = allJobChecklists.every((jc) => {
      const items = JSON.parse(jc.id === params.checklistId ? JSON.stringify(parsed.data.items) : jc.items);
      return items.every((i: { required: boolean; checked: boolean }) => !i.required || i.checked);
    });

    await db
      .update(jobs)
      .set({ checklistComplete: allComplete, updatedAt: new Date().toISOString() })
      .where(eq(jobs.id, params.id));

    return NextResponse.json({ ...updated, items: parsed.data.items });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; checklistId: string } }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    const db = getDb();

    await db.delete(jobChecklists).where(eq(jobChecklists.id, params.checklistId));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
