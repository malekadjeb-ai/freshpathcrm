import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { webhookEndpoints, webhookLogs } from "@/src/db/schema";
import { desc, count } from "drizzle-orm";
import { webhookEndpointSchema } from "@/lib/validations/webhook";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : null;
    const limit = Math.min(parseInt(searchParams.get("limit") || "25"), 100);

    const [totalResult, endpoints] = await Promise.all([
      db.select({ count: count() }).from(webhookEndpoints),
      page
        ? db.select().from(webhookEndpoints).orderBy(desc(webhookEndpoints.createdAt)).limit(limit).offset((page - 1) * limit)
        : db.select().from(webhookEndpoints).orderBy(desc(webhookEndpoints.createdAt)),
    ]);

    const total = totalResult[0].count;

    const logCounts = await db
      .select({ endpointId: webhookLogs.endpointId, count: count() })
      .from(webhookLogs)
      .groupBy(webhookLogs.endpointId);

    const logCountMap = new Map(logCounts.map((l) => [l.endpointId, l.count]));

    const result = endpoints.map((ep) => ({
      ...ep,
      events: JSON.parse(ep.events || "[]"),
      logCount: logCountMap.get(ep.id) ?? 0,
    }));

    if (page) {
      return NextResponse.json({
        data: result,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }
    return NextResponse.json(result);
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
