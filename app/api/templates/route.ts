import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { messageTemplates } from "@/src/db/schema";
import { asc, eq, count } from "drizzle-orm";
import { templateSchema } from "@/lib/validations/template";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : null;
    const limit = Math.min(parseInt(searchParams.get("limit") || "25"), 100);

    const where = eq(messageTemplates.tenantId, tenantId);

    const [totalResult, templates] = await Promise.all([
      db.select({ count: count() }).from(messageTemplates).where(where),
      page
        ? db.select().from(messageTemplates).where(where).orderBy(asc(messageTemplates.category), asc(messageTemplates.name)).limit(limit).offset((page - 1) * limit)
        : db.select().from(messageTemplates).where(where).orderBy(asc(messageTemplates.category), asc(messageTemplates.name)),
    ]);

    const total = totalResult[0].count;

    if (page) {
      return NextResponse.json({
        data: templates,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }
    return NextResponse.json(templates);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const body = await req.json();
    const parsed = templateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [template] = await db.insert(messageTemplates).values({ ...parsed.data, tenantId }).returning();

    return NextResponse.json(template, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
