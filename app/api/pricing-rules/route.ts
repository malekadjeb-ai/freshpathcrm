import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { pricingRules } from "@/src/db/schema";
import { asc, desc } from "drizzle-orm";

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const rules = await db.select().from(pricingRules).orderBy(desc(pricingRules.priority), asc(pricingRules.createdAt));

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
    const { session: _session, tenantId } = auth;

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
