import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/src/db";
import { promoCodes } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { validatePromoSchema } from "@/lib/validations/promo-code";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = validatePromoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const db = getDb();
    const { code, subtotal } = parsed.data;

    const [promo] = await db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.code, code.toUpperCase().trim()));

    if (!promo) {
      return NextResponse.json({ valid: false, error: "Promo code not found" });
    }

    if (!promo.isActive) {
      return NextResponse.json({ valid: false, error: "This promo code is no longer active" });
    }

    const now = new Date();
    if (promo.validFrom && now < new Date(promo.validFrom)) {
      return NextResponse.json({ valid: false, error: "This promo code is not yet valid" });
    }

    if (promo.validUntil && now > new Date(promo.validUntil)) {
      return NextResponse.json({ valid: false, error: "This promo code has expired" });
    }

    if (promo.maxUses && promo.usedCount >= promo.maxUses) {
      return NextResponse.json({ valid: false, error: "This promo code has reached its usage limit" });
    }

    if (promo.minOrderValue && subtotal < promo.minOrderValue) {
      return NextResponse.json({
        valid: false,
        error: `Minimum order of $${promo.minOrderValue.toFixed(2)} required`,
      });
    }

    const discount =
      promo.discountType === "percent"
        ? subtotal * (promo.discountValue / 100)
        : Math.min(promo.discountValue, subtotal);

    return NextResponse.json({
      valid: true,
      promoCodeId: promo.id,
      code: promo.code,
      description: promo.description,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      discount: Math.round(discount * 100) / 100,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
