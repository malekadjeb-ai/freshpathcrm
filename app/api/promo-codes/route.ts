import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { promoCodes } from "@/src/db/schema";
import { eq, desc } from "drizzle-orm";
import { promoCodeSchema } from "@/lib/validations/promo-code";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const active = searchParams.get("active");

    let codes;
    if (active === "true") {
      codes = await db.select().from(promoCodes).where(eq(promoCodes.isActive, true)).orderBy(desc(promoCodes.createdAt));
    } else {
      codes = await db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
    }

    return NextResponse.json(codes);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const body = await req.json();
    const parsed = promoCodeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    // Check for duplicate code
    const [existing] = await db.select().from(promoCodes).where(eq(promoCodes.code, data.code));
    if (existing) {
      return NextResponse.json({ error: "A promo code with this code already exists" }, { status: 409 });
    }

    const [promo] = await db.insert(promoCodes).values({
      code: data.code,
      description: data.description || null,
      discountType: data.discountType,
      discountValue: data.discountValue,
      minOrderValue: data.minOrderValue ?? null,
      maxUses: data.maxUses ?? null,
      validFrom: data.validFrom ? new Date(data.validFrom).toISOString() : new Date().toISOString(),
      validUntil: data.validUntil ? new Date(data.validUntil).toISOString() : null,
      isActive: data.isActive,
    }).returning();

    return NextResponse.json(promo, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
