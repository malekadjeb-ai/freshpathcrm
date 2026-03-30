import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { expenses } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";
import { expenseSchema } from "@/lib/validations/expense";

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
    const parsed = expenseSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    if (data.date) updateData.date = new Date(data.date).toISOString();

    const expense = (
      await db
        .update(expenses)
        .set(updateData)
        .where(and(eq(expenses.id, params.id), eq(expenses.tenantId, tenantId)))
        .returning()
    )[0];

    return NextResponse.json(expense);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
    await db.delete(expenses).where(and(eq(expenses.id, params.id), eq(expenses.tenantId, tenantId)));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
