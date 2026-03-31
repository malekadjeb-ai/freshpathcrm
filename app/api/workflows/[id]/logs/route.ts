import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { workflowLogs } from "@/src/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    const db = getDb();
    const { id } = await params;

    const logs = await db
      .select()
      .from(workflowLogs)
      .where(eq(workflowLogs.workflowId, id))
      .orderBy(desc(workflowLogs.createdAt))
      .limit(50);

    return NextResponse.json(
      logs.map((l) => ({
        ...l,
        actions: JSON.parse(l.actions),
      }))
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
