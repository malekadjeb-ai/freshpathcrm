import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { servicePlans, subscriptions } from "@/src/db/schema";
import { asc, count } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : null;
    const limit = Math.min(parseInt(searchParams.get("limit") || "25"), 100);

    const [totalResult, plans] = await Promise.all([
      db.select({ count: count() }).from(servicePlans),
      page
        ? db.select().from(servicePlans).orderBy(asc(servicePlans.sortOrder)).limit(limit).offset((page - 1) * limit)
        : db.select().from(servicePlans).orderBy(asc(servicePlans.sortOrder)),
    ]);

    const total = totalResult[0].count;

    // Get subscription counts
    const subCounts = await db
      .select({ planId: subscriptions.planId, count: count() })
      .from(subscriptions)
      .groupBy(subscriptions.planId);

    const subCountMap = new Map(subCounts.map((s) => [s.planId, s.count]));

    const result = plans.map((plan) => ({
      ...plan,
      _count: { subscriptions: subCountMap.get(plan.id) ?? 0 },
    }));

    if (page) {
      return NextResponse.json({
        data: result,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Service plans error:", error);
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    const db = getDb();
    const body = await req.json();
    const { name, description, monthlyPrice, frequency, features, sortOrder, isActive } = body;
    if (!name || monthlyPrice == null) {
      return NextResponse.json({ error: "Name and monthlyPrice are required" }, { status: 400 });
    }

    const [plan] = await db.insert(servicePlans).values({
      name: String(name),
      description: description ? String(description) : null,
      monthlyPrice: Number(monthlyPrice),
      frequency: frequency ? String(frequency) : "monthly",
      features: features ? String(features) : null,
      sortOrder: sortOrder != null ? Number(sortOrder) : 0,
      isActive: isActive !== false,
    }).returning();

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Create plan error:", error);
    return NextResponse.json({ error: "Failed to create plan" }, { status: 500 });
  }
}
