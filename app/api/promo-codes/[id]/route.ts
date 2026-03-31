import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { promoCodes } from "@/src/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { promoCodeSchema } from "@/lib/validations/promo-code";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    const db = getDb();
    const [promo] = await db.select().from(promoCodes).where(eq(promoCodes.id, params.id));
    if (!promo) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(promo);
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
    const parsed = promoCodeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    // Check for duplicate code (excluding this one)
    const duplicates = await db
      .select()
      .from(promoCodes)
      .where(and(eq(promoCodes.code, data.code), ne(promoCodes.id, params.id)));
    if (duplicates.length > 0) {
      return NextResponse.json({ error: "A promo code with this code already exists" }, { status: 409 });
    }

    const [promo] = await db
      .update(promoCodes)
      .set({
        code: data.code,
        description: data.description || null,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minOrderValue: data.minOrderValue ?? null,
        maxUses: data.maxUses ?? null,
        validFrom: data.validFrom ? new Date(data.validFrom).toISOString() : undefined,
        validUntil: data.validUntil ? new Date(data.validUntil).toISOString() : null,
        isActive: data.isActive,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(promoCodes.id, params.id))
      .returning();

    return NextResponse.json(promo);
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
    await db.delete(promoCodes).where(eq(promoCodes.id, params.id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
