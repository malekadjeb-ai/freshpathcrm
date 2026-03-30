import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { messageTemplates } from "@/src/db/schema";
import { asc, eq } from "drizzle-orm";
import { templateSchema } from "@/lib/validations/template";

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const templates = await db
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.tenantId, tenantId))
      .orderBy(asc(messageTemplates.category), asc(messageTemplates.name));

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
