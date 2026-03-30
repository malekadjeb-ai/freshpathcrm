import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { referrals, customers } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();

    // Verify referral's referrer belongs to tenant
    const [existingRef] = await db.select().from(referrals).where(eq(referrals.id, params.id));
    if (!existingRef) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, existingRef.referrerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    if (body.status !== undefined) updateData.status = body.status;
    if (body.referredCustomerId !== undefined) updateData.referredCustomerId = body.referredCustomerId;
    if (body.rewardType !== undefined) updateData.rewardType = body.rewardType;
    if (body.rewardValue !== undefined) updateData.rewardValue = body.rewardValue;
    if (body.notes !== undefined) updateData.notes = body.notes;

    // Auto-set fulfillment date when status changes to rewarded
    if (body.status === "rewarded" && !body.rewardFulfilledAt) {
      updateData.rewardFulfilledAt = new Date().toISOString();
    }

    await db.update(referrals).set(updateData).where(eq(referrals.id, params.id));

    const [row] = await db
      .select({
        referral: referrals,
        referrer: { id: customers.id, name: customers.name },
      })
      .from(referrals)
      .leftJoin(customers, eq(referrals.referrerId, customers.id))
      .where(eq(referrals.id, params.id));

    let referredCustomer = null;
    if (row.referral.referredCustomerId) {
      const [rc] = await db
        .select({ id: customers.id, name: customers.name })
        .from(customers)
        .where(eq(customers.id, row.referral.referredCustomerId));
      referredCustomer = rc || null;
    }

    return NextResponse.json({
      ...row.referral,
      referrer: row.referrer?.id ? row.referrer : null,
      referredCustomer,
    });
  } catch {
    return NextResponse.json({ error: "Failed to update referral" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();

    // Verify referral's referrer belongs to tenant
    const [existingDel] = await db.select().from(referrals).where(eq(referrals.id, params.id));
    if (!existingDel) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const [custCheckDel] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, existingDel.referrerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheckDel) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.delete(referrals).where(eq(referrals.id, params.id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete referral" }, { status: 500 });
  }
}
