import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { webhookEndpoints, webhookLogs } from "@/src/db/schema";
import { desc, count } from "drizzle-orm";
import { webhookEndpointSchema } from "@/lib/validations/webhook";

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();

    const endpoints = await db.select().from(webhookEndpoints).orderBy(desc(webhookEndpoints.createdAt));

    const logCounts = await db
      .select({ endpointId: webhookLogs.endpointId, count: count() })
      .from(webhookLogs)
      .groupBy(webhookLogs.endpointId);

    const logCountMap = new Map(logCounts.map((l) => [l.endpointId, l.count]));

    return NextResponse.json(
      endpoints.map((ep) => ({
        ...ep,
        events: JSON.parse(ep.events || "[]"),
        logCount: logCountMap.get(ep.id) ?? 0,
      }))
    );
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
    const parsed = webhookEndpointSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    const [endpoint] = await db.insert(webhookEndpoints).values({
      url: data.url,
      events: JSON.stringify(data.events),
      secret: data.secret || null,
      description: data.description || null,
      isActive: data.isActive,
    }).returning();

    return NextResponse.json({ ...endpoint, events: data.events }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
