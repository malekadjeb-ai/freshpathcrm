import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { webhookEndpoints, webhookLogs } from "@/src/db/schema";
import { eq, count } from "drizzle-orm";
import { webhookEndpointSchema } from "@/lib/validations/webhook";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    const db = getDb();
    const [endpoint] = await db.select().from(webhookEndpoints).where(eq(webhookEndpoints.id, params.id));
    if (!endpoint) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [logCountRow] = await db
      .select({ count: count() })
      .from(webhookLogs)
      .where(eq(webhookLogs.endpointId, params.id));

    return NextResponse.json({
      ...endpoint,
      events: JSON.parse(endpoint.events || "[]"),
      logCount: logCountRow?.count ?? 0,
    });
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
    const parsed = webhookEndpointSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    if (data.url !== undefined) updateData.url = data.url;
    if (data.events !== undefined) updateData.events = JSON.stringify(data.events);
    if (data.secret !== undefined) updateData.secret = data.secret || null;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const [endpoint] = await db
      .update(webhookEndpoints)
      .set(updateData)
      .where(eq(webhookEndpoints.id, params.id))
      .returning();

    return NextResponse.json({
      ...endpoint,
      events: JSON.parse(endpoint.events || "[]"),
    });
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
    await db.delete(webhookLogs).where(eq(webhookLogs.endpointId, params.id));
    await db.delete(webhookEndpoints).where(eq(webhookEndpoints.id, params.id));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
