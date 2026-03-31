import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { eq, and, desc, count } from "drizzle-orm";
import { notifications } from "@/src/db/schema";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session, tenantId: _tenantId } = auth;

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : null;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    const db = getDb();
    const userId = (session.user as { id: string }).id;
    const where = unreadOnly
      ? and(eq(notifications.userId, userId), eq(notifications.read, false))
      : eq(notifications.userId, userId);

    const [totalResult, rows] = await Promise.all([
      db.select({ count: count() }).from(notifications).where(where),
      page
        ? db.select().from(notifications).where(where).orderBy(desc(notifications.createdAt)).limit(limit).offset((page - 1) * limit)
        : db.select().from(notifications).where(where).orderBy(desc(notifications.createdAt)).limit(50),
    ]);

    const total = totalResult[0].count;

    if (page) {
      return NextResponse.json({
        data: rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session, tenantId: _tenantId } = auth;

    const { markAllRead } = await req.json();

    if (markAllRead) {
      const db = getDb();
      await db.update(notifications)
        .set({ read: true })
        .where(and(eq(notifications.userId, (session.user as { id: string }).id), eq(notifications.read, false)));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
