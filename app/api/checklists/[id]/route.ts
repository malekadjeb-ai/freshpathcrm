import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { checklists } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { checklistSchema } from "@/lib/validations/checklist";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    const db = getDb();
    const [checklist] = await db.select().from(checklists).where(eq(checklists.id, params.id));
    if (!checklist) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ ...checklist, items: JSON.parse(checklist.items) });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    const db = getDb();
    const body = await req.json();
    const parsed = checklistSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    const [checklist] = await db
      .update(checklists)
      .set({
        name: data.name,
        serviceItemId: data.serviceItemId ?? null,
        items: JSON.stringify(data.items),
        isActive: data.isActive,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(checklists.id, params.id))
      .returning();

    return NextResponse.json({ ...checklist, items: data.items });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    const db = getDb();
    await db.delete(checklists).where(eq(checklists.id, params.id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
