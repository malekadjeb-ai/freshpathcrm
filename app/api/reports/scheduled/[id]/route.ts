import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { scheduledReports } from "@/src/db/schema";
import { eq } from "drizzle-orm";

// PATCH: Update report (toggle active, change frequency)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const { id } = params;
    const body = await req.json();

    const db = getDb();
    const existing = await db.select().from(scheduledReports).where(eq(scheduledReports.id, id)).limit(1).then(r => r[0]);
    if (!existing) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;
    if (typeof body.frequency === "string") data.frequency = body.frequency;
    if (typeof body.name === "string") data.name = body.name;
    if (typeof body.type === "string") data.type = body.type;

    const [report] = await db.update(scheduledReports).set(data).where(eq(scheduledReports.id, id)).returning();
    return NextResponse.json(report);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Delete report
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const { id } = params;
    const db = getDb();

    const existing = await db.select().from(scheduledReports).where(eq(scheduledReports.id, id)).limit(1).then(r => r[0]);
    if (!existing) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    await db.delete(scheduledReports).where(eq(scheduledReports.id, id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
