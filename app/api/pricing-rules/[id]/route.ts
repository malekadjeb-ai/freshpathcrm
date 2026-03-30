import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { pricingRules } from "@/src/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const body = await req.json();
    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.modifier !== undefined) updateData.modifier = parseFloat(body.modifier);
    if (body.conditions !== undefined) updateData.conditions = JSON.stringify(body.conditions);
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.priority !== undefined) updateData.priority = body.priority;

    const db = getDb();
    const [rule] = await db.update(pricingRules).set(updateData).where(eq(pricingRules.id, params.id)).returning();

    return NextResponse.json(rule);
  } catch (error) {
    console.error("Update rule error:", error);
    return NextResponse.json({ error: "Failed to update rule" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    await db.delete(pricingRules).where(eq(pricingRules.id, params.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete rule error:", error);
    return NextResponse.json({ error: "Failed to delete rule" }, { status: 500 });
  }
}
