import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { jobChecklists, checklists, jobs, customers } from "@/src/db/schema";
import { eq, and, asc, inArray } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();

    // Verify job's customer belongs to tenant
    const [jobRow] = await db.select({ customerId: jobs.customerId }).from(jobs).where(eq(jobs.id, params.id)).limit(1);
    if (!jobRow) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, jobRow.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const jcRows = await db
      .select()
      .from(jobChecklists)
      .where(eq(jobChecklists.jobId, params.id))
      .orderBy(asc(jobChecklists.createdAt));

    // Batch: fetch all checklist names at once
    const checklistIds = [...new Set(jcRows.map(jc => jc.checklistId))];
    const checklistBatch = checklistIds.length
      ? await db.select({ id: checklists.id, name: checklists.name }).from(checklists).where(inArray(checklists.id, checklistIds))
      : [];
    const checklistMap = new Map(checklistBatch.map(c => [c.id, c]));

    const result = jcRows.map((jc) => ({
      ...jc,
      checklistName: checklistMap.get(jc.checklistId)?.name ?? "Unknown",
      items: JSON.parse(jc.items),
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();

    // Verify job's customer belongs to tenant
    const [jobRow2] = await db.select({ customerId: jobs.customerId }).from(jobs).where(eq(jobs.id, params.id)).limit(1);
    if (!jobRow2) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    const [custCheck2] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, jobRow2.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck2) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const body = await req.json();
    const { checklistId } = body;

    if (!checklistId) {
      return NextResponse.json({ error: "checklistId is required" }, { status: 400 });
    }

    // Get the checklist template
    const [checklist] = await db.select().from(checklists).where(eq(checklists.id, checklistId));
    if (!checklist) {
      return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
    }

    // Check if already attached
    const [existing] = await db
      .select()
      .from(jobChecklists)
      .where(and(eq(jobChecklists.jobId, params.id), eq(jobChecklists.checklistId, checklistId)));
    if (existing) {
      return NextResponse.json({ error: "Checklist already attached to this job" }, { status: 409 });
    }

    // Create job checklist with items initialized (all unchecked)
    const templateItems = JSON.parse(checklist.items);
    const jobItems = templateItems.map((item: { label: string; required: boolean }) => ({
      label: item.label,
      required: item.required ?? false,
      checked: false,
      note: "",
    }));

    const [jobChecklist] = await db
      .insert(jobChecklists)
      .values({
        jobId: params.id,
        checklistId,
        items: JSON.stringify(jobItems),
      })
      .returning();

    return NextResponse.json({
      ...jobChecklist,
      checklistName: checklist.name,
      items: jobItems,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
