import { NextRequest, NextResponse } from "next/server";
import { requireAuthWithPermission } from "@/lib/require-permission";
import { getDb } from "@/src/db";
import { users } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";
import { ROLE_HIERARCHY, type Role } from "@/lib/permissions";

const VALID_ROLES: Role[] = ["OWNER", "ADMIN", "TECH", "VIEWER"];

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await requireAuthWithPermission("users:write");
    if ("error" in auth) return auth.error;
    const { session, tenantId } = auth;
    const { userId } = await params;

    const body = await req.json();
    const { role } = body as { role?: string };

    if (!role || !VALID_ROLES.includes(role as Role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (userId === session.user.id) {
      return NextResponse.json({ error: "You cannot change your own role" }, { status: 403 });
    }

    const db = getDb();

    const targetUser = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .limit(1)
      .then((r) => r[0]);

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.role === "OWNER") {
      return NextResponse.json({ error: "Cannot change the owner's role" }, { status: 403 });
    }

    const myRole = ((session.user as Record<string, unknown>).role as string) || "VIEWER";
    const myLevel = ROLE_HIERARCHY[myRole as Role] ?? 0;
    const newLevel = ROLE_HIERARCHY[role as Role] ?? 0;

    if (newLevel >= myLevel) {
      return NextResponse.json(
        { error: "Cannot promote someone to or above your own role level" },
        { status: 403 }
      );
    }

    await db
      .update(users)
      .set({ role, updatedAt: new Date().toISOString() })
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update role" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await requireAuthWithPermission("users:delete");
    if ("error" in auth) return auth.error;
    const { session, tenantId } = auth;
    const { userId } = await params;

    if (userId === session.user.id) {
      return NextResponse.json({ error: "You cannot remove yourself" }, { status: 403 });
    }

    const db = getDb();

    const targetUser = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .limit(1)
      .then((r) => r[0]);

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.role === "OWNER") {
      return NextResponse.json({ error: "Cannot remove the owner" }, { status: 403 });
    }

    const myRole = ((session.user as Record<string, unknown>).role as string) || "VIEWER";
    const myLevel = ROLE_HIERARCHY[myRole as Role] ?? 0;
    const targetLevel = ROLE_HIERARCHY[targetUser.role as Role] ?? 0;

    if (targetLevel >= myLevel) {
      return NextResponse.json(
        { error: "Cannot remove someone at or above your role level" },
        { status: 403 }
      );
    }

    await db
      .delete(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to remove team member" },
      { status: 500 }
    );
  }
}
