import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { checklists } from "@/src/db/schema";
import { eq, desc, count as countFn } from "drizzle-orm";
import { checklistSchema } from "@/lib/validations/checklist";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const active = searchParams.get("active");
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : null;
    const limit = Math.min(parseInt(searchParams.get("limit") || "25"), 100);

    const where = active === "true" ? eq(checklists.isActive, true) : undefined;

    const [totalResult, allChecklists] = await Promise.all([
      db.select({ count: countFn() }).from(checklists).where(where),
      page
        ? db.select().from(checklists).where(where).orderBy(desc(checklists.createdAt)).limit(limit).offset((page - 1) * limit)
        : db.select().from(checklists).where(where).orderBy(desc(checklists.createdAt)),
    ]);

    const total = totalResult[0].count;

    const parsed = allChecklists.map((c) => ({
      ...c,
      items: JSON.parse(c.items),
    }));

    if (page) {
      return NextResponse.json({
        data: parsed,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    const db = getDb();
    const body = await req.json();
    const parsed = checklistSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    const [checklist] = await db.insert(checklists).values({
      name: data.name,
      serviceItemId: data.serviceItemId ?? null,
      items: JSON.stringify(data.items),
      isActive: data.isActive,
    }).returning();

    return NextResponse.json({ ...checklist, items: data.items }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
