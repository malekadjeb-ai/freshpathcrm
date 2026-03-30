import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { reviews, customers } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();

    // Verify review's customer belongs to tenant
    const [existingReview] = await db.select().from(reviews).where(eq(reviews.id, params.id));
    if (!existingReview) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, existingReview.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    if (body.rating !== undefined) updateData.rating = body.rating;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.platform !== undefined) updateData.platform = body.platform;
    if (body.reviewedAt !== undefined) {
      updateData.reviewedAt = body.reviewedAt ? new Date(body.reviewedAt).toISOString() : null;
    }

    await db
      .update(reviews)
      .set(updateData)
      .where(eq(reviews.id, params.id));

    const [row] = await db
      .select({
        review: reviews,
        customer: { id: customers.id, name: customers.name },
      })
      .from(reviews)
      .leftJoin(customers, eq(reviews.customerId, customers.id))
      .where(eq(reviews.id, params.id));

    return NextResponse.json({
      ...row.review,
      customer: row.customer?.id ? row.customer : null,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();

    // Verify review's customer belongs to tenant
    const [existingDel] = await db.select().from(reviews).where(eq(reviews.id, params.id));
    if (!existingDel) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const [custCheckDel] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, existingDel.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheckDel) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.delete(reviews).where(eq(reviews.id, params.id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
