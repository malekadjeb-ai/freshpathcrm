import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { messageTemplates } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";
import { templateSchema } from "@/lib/validations/template";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const [template] = await db
      .select()
      .from(messageTemplates)
      .where(and(eq(messageTemplates.id, params.id), eq(messageTemplates.tenantId, tenantId)));

    if (!template)
      return NextResponse.json({ error: "Template not found" }, { status: 404 });

    return NextResponse.json(template);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const [template] = await db
      .update(messageTemplates)
      .set({ ...parsed.data, updatedAt: new Date().toISOString() })
      .where(and(eq(messageTemplates.id, params.id), eq(messageTemplates.tenantId, tenantId)))
      .returning();

    return NextResponse.json(template);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const [template] = await db
      .select()
      .from(messageTemplates)
      .where(and(eq(messageTemplates.id, params.id), eq(messageTemplates.tenantId, tenantId)));

    if (!template)
      return NextResponse.json({ error: "Template not found" }, { status: 404 });

    if (template.isDefault)
      return NextResponse.json(
        { error: "Cannot delete default templates" },
        { status: 400 }
      );

    await db.delete(messageTemplates).where(and(eq(messageTemplates.id, params.id), eq(messageTemplates.tenantId, tenantId)));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
