import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { activities, customers } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const { id } = await params;

    // Verify activity belongs to tenant's customer
    const [existing] = await db.select().from(activities).where(eq(activities.id, id));
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.customerId) {
      const [c] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, existing.customerId), eq(customers.tenantId, tenantId))).limit(1);
      if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();

    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (body.summary !== undefined) updateData.summary = body.summary;
    if (body.followUpDone !== undefined) updateData.followUpDone = body.followUpDone;
    if (body.followUpDate !== undefined) {
      updateData.followUpDate = body.followUpDate ? new Date(body.followUpDate).toISOString() : null;
    }

    const [activity] = await db
      .update(activities)
      .set(updateData)
      .where(eq(activities.id, id))
      .returning();

    // Fetch customer for response
    const [customer] = activity.customerId
      ? await db.select({ id: customers.id, name: customers.name }).from(customers).where(eq(customers.id, activity.customerId))
      : [null];

    return NextResponse.json({ ...activity, customer });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const { id } = await params;

    // Verify activity belongs to tenant's customer
    const [existing] = await db.select().from(activities).where(eq(activities.id, id));
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.customerId) {
      const [c] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, existing.customerId), eq(customers.tenantId, tenantId))).limit(1);
      if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.delete(activities).where(eq(activities.id, id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
