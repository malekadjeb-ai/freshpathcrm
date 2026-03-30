import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { webhookLogs } from "@/src/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const logs = await db
      .select()
      .from(webhookLogs)
      .where(eq(webhookLogs.endpointId, params.id))
      .orderBy(desc(webhookLogs.createdAt))
      .limit(50);

    return NextResponse.json(logs);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
