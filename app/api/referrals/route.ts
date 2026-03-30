import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { referrals, customers } from "@/src/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";

const referralSchema = z.object({
  referrerId: z.string().min(1),
  referredName: z.string().min(1),
  referredPhone: z.string().optional(),
  referredEmail: z.string().optional(),
  rewardType: z.string().optional(),
  rewardValue: z.number().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "25");

    const rows = await db
      .select({
        referral: referrals,
        referrer: { id: customers.id, name: customers.name, phone: customers.phone },
      })
      .from(referrals)
      .leftJoin(customers, eq(referrals.referrerId, customers.id))
      .where(eq(customers.tenantId, tenantId))
      .orderBy(referrals.createdAt);

    let filtered = rows;
    if (status) {
      filtered = filtered.filter((r) => r.referral.status === status);
    }

    filtered.sort((a, b) => (b.referral.createdAt > a.referral.createdAt ? 1 : -1));

    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    // Batch: fetch all referred customers at once
    const referredCustIds = [...new Set(paginated.filter(r => r.referral.referredCustomerId).map(r => r.referral.referredCustomerId!))];
    const referredCustBatch = referredCustIds.length
      ? await db.select({ id: customers.id, name: customers.name, phone: customers.phone }).from(customers).where(inArray(customers.id, referredCustIds))
      : [];
    const referredCustMap = new Map(referredCustBatch.map(c => [c.id, c]));

    const result = paginated.map((r) => ({
      ...r.referral,
      referrer: r.referrer?.id ? r.referrer : null,
      referredCustomer: r.referral.referredCustomerId ? referredCustMap.get(r.referral.referredCustomerId) ?? null : null,
    }));

    return NextResponse.json({ data: result, meta: { total, page, limit } });
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
    const parsed = referralSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    // Verify referrer belongs to tenant
    const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, data.referrerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck) return NextResponse.json({ error: "Referrer not found" }, { status: 404 });

    const [referral] = await db
      .insert(referrals)
      .values({
        referrerId: data.referrerId,
        referredName: data.referredName,
        referredPhone: data.referredPhone,
        referredEmail: data.referredEmail,
        referredCustomerId: body.referredCustomerId,
        status: body.status || "pending",
        rewardType: data.rewardType,
        rewardValue: data.rewardValue,
        notes: data.notes,
      })
      .returning();

    const [referrerRow] = await db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(eq(customers.id, data.referrerId));

    return NextResponse.json(
      { ...referral, referrer: referrerRow || null },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Failed to create referral" }, { status: 500 });
  }
}
