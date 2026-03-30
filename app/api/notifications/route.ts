import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { eq, and, desc } from "drizzle-orm";
import { notifications } from "@/src/db/schema";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session, tenantId } = auth;

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";

    const db = getDb();
    const userId = (session.user as { id: string }).id;
    const rows = await db.select().from(notifications)
      .where(unreadOnly
        ? and(eq(notifications.userId, userId), eq(notifications.read, false))
        : eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

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
    const { session, tenantId } = auth;

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
