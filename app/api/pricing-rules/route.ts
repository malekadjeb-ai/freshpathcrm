import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { pricingRules } from "@/src/db/schema";
import { asc, desc, count } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : null;
    const limit = Math.min(parseInt(searchParams.get("limit") || "25"), 100);

    const [totalResult, rules] = await Promise.all([
      db.select({ count: count() }).from(pricingRules),
      page
        ? db.select().from(pricingRules).orderBy(desc(pricingRules.priority), asc(pricingRules.createdAt)).limit(limit).offset((page - 1) * limit)
        : db.select().from(pricingRules).orderBy(desc(pricingRules.priority), asc(pricingRules.createdAt)),
    ]);

    const total = totalResult[0].count;

    if (page) {
      return NextResponse.json({
        data: rules,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }
    return NextResponse.json(rules);
  } catch (error) {
    console.error("Pricing rules error:", error);
    return NextResponse.json({ error: "Failed to fetch rules" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    const body = await req.json();
    const { name, type, modifier, conditions, priority } = body;

    if (!name || !type || modifier === undefined) {
      return NextResponse.json({ error: "name, type, and modifier required" }, { status: 400 });
    }

    const db = getDb();
    const [rule] = await db.insert(pricingRules).values({
      name,
      type,
      modifier: parseFloat(modifier),
      conditions: JSON.stringify(conditions || {}),
      priority: priority || 0,
    }).returning();

    return NextResponse.json(rule);
  } catch (error) {
    console.error("Create rule error:", error);
    return NextResponse.json({ error: "Failed to create rule" }, { status: 500 });
  }
}
