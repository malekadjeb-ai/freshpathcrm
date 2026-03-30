import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { scheduledMessages, customers } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const [msg] = await db.select().from(scheduledMessages).where(eq(scheduledMessages.id, params.id));
    if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Verify tenant ownership via customer
    const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, msg.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (msg.status === "sent") {
      return NextResponse.json({ error: "Cannot delete sent message" }, { status: 400 });
    }

    await db.delete(scheduledMessages).where(eq(scheduledMessages.id, params.id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();

    // Verify tenant ownership via customer
    const [existingMsg] = await db.select().from(scheduledMessages).where(eq(scheduledMessages.id, params.id));
    if (!existingMsg) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, existingMsg.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const updateData: Record<string, unknown> = {};

    if (body.status !== undefined) updateData.status = body.status;
    if (body.scheduledAt !== undefined) updateData.scheduledAt = new Date(body.scheduledAt).toISOString();
    if (body.body !== undefined) updateData.body = body.body;

    const [msg] = await db
      .update(scheduledMessages)
      .set(updateData)
      .where(eq(scheduledMessages.id, params.id))
      .returning();

    return NextResponse.json(msg);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
