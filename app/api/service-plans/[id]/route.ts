import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { servicePlans } from "@/src/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    const db = getDb();
    const body = await req.json();
    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    if (body.name !== undefined) updateData.name = String(body.name);
    if (body.description !== undefined) updateData.description = body.description ? String(body.description) : null;
    if (body.monthlyPrice !== undefined) updateData.monthlyPrice = Number(body.monthlyPrice);
    if (body.frequency !== undefined) updateData.frequency = String(body.frequency);
    if (body.features !== undefined) updateData.features = body.features ? String(body.features) : null;
    if (body.sortOrder !== undefined) updateData.sortOrder = Number(body.sortOrder);
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);
    if (body.color !== undefined) updateData.color = String(body.color);

    const [plan] = await db
      .update(servicePlans)
      .set(updateData)
      .where(eq(servicePlans.id, params.id))
      .returning();

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Update plan error:", error);
    return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    const db = getDb();
    await db
      .update(servicePlans)
      .set({ isActive: false, updatedAt: new Date().toISOString() })
      .where(eq(servicePlans.id, params.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete plan error:", error);
    return NextResponse.json({ error: "Failed to delete plan" }, { status: 500 });
  }
}
