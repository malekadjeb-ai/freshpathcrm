import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { subscriptions, customers } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();

    // Verify subscription belongs to tenant via customer
    const [existingSub] = await db.select().from(subscriptions).where(eq(subscriptions.id, params.id));
    if (!existingSub) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, existingSub.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const { action, cancelReason } = body;
    const now = new Date().toISOString();

    if (action === "pause") {
      const [sub] = await db
        .update(subscriptions)
        .set({ status: "paused", pausedAt: now, updatedAt: now })
        .where(eq(subscriptions.id, params.id))
        .returning();
      return NextResponse.json(sub);
    }

    if (action === "resume") {
      const [sub] = await db
        .update(subscriptions)
        .set({ status: "active", pausedAt: null, updatedAt: now })
        .where(eq(subscriptions.id, params.id))
        .returning();
      return NextResponse.json(sub);
    }

    if (action === "cancel") {
      const [sub] = await db
        .update(subscriptions)
        .set({
          status: "cancelled",
          cancelledAt: now,
          cancelReason: cancelReason || null,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, params.id))
        .returning();
      return NextResponse.json(sub);
    }

    // Generic update — only allow safe fields
    const updateData: Record<string, unknown> = { updatedAt: now };
    if (body.planId !== undefined) updateData.planId = String(body.planId);
    if (body.vehicleId !== undefined) updateData.vehicleId = body.vehicleId ? String(body.vehicleId) : null;
    if (body.nextBillingDate !== undefined) updateData.nextBillingDate = new Date(body.nextBillingDate).toISOString();
    if (body.nextServiceDate !== undefined) updateData.nextServiceDate = new Date(body.nextServiceDate).toISOString();

    if (Object.keys(updateData).length === 1) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const [sub] = await db
      .update(subscriptions)
      .set(updateData)
      .where(eq(subscriptions.id, params.id))
      .returning();

    return NextResponse.json(sub);
  } catch (error) {
    console.error("Update subscription error:", error);
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
  }
}
