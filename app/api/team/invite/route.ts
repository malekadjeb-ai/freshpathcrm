import { NextRequest, NextResponse } from "next/server";
import { requireAuthWithPermission } from "@/lib/require-permission";
import { getDb } from "@/src/db";
import { invitations, users } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";
import { ROLE_HIERARCHY, type Role } from "@/lib/permissions";

const VALID_ROLES: Role[] = ["OWNER", "ADMIN", "TECH", "VIEWER"];

export async function GET() {
  try {
    const auth = await requireAuthWithPermission("users:read");
    if ("error" in auth) return auth.error;
    const { tenantId } = auth;

    const db = getDb();
    const pending = await db
      .select()
      .from(invitations)
      .where(and(eq(invitations.tenantId, tenantId), eq(invitations.status, "pending")));

    return NextResponse.json(pending);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthWithPermission("users:write");
    if ("error" in auth) return auth.error;
    const { session, tenantId } = auth;

    const body = await req.json();
    const { email, role } = body as { email?: string; role?: string };

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    if (!role || !VALID_ROLES.includes(role as Role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const inviterRole = ((session.user as Record<string, unknown>).role as string) || "VIEWER";
    const inviterLevel = ROLE_HIERARCHY[inviterRole as Role] ?? 0;
    const targetLevel = ROLE_HIERARCHY[role as Role] ?? 0;

    if (targetLevel >= inviterLevel) {
      return NextResponse.json(
        { error: "Cannot invite someone at or above your role level" },
        { status: 403 }
      );
    }

    const db = getDb();

    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, email), eq(users.tenantId, tenantId)))
      .limit(1)
      .then((r) => r[0]);

    if (existingUser) {
      return NextResponse.json(
        { error: "This email is already on your team" },
        { status: 409 }
      );
    }

    const existingInvite = await db
      .select({ id: invitations.id })
      .from(invitations)
      .where(
        and(
          eq(invitations.email, email),
          eq(invitations.tenantId, tenantId),
          eq(invitations.status, "pending")
        )
      )
      .limit(1)
      .then((r) => r[0]);

    if (existingInvite) {
      return NextResponse.json(
        { error: "A pending invitation already exists for this email" },
        { status: 409 }
      );
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const [invitation] = await db
      .insert(invitations)
      .values({
        tenantId,
        email,
        role,
        invitedBy: session.user.id,
        token,
        expiresAt,
      })
      .returning({ id: invitations.id });

    return NextResponse.json({
      success: true,
      invitationId: invitation.id,
      inviteUrl: `/invite/${token}`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send invitation" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuthWithPermission("users:write");
    if ("error" in auth) return auth.error;
    const { tenantId } = auth;

    const { searchParams } = new URL(req.url);
    const invitationId = searchParams.get("id");

    if (!invitationId) {
      return NextResponse.json({ error: "Invitation ID required" }, { status: 400 });
    }

    const db = getDb();
    await db
      .update(invitations)
      .set({ status: "expired" })
      .where(
        and(
          eq(invitations.id, invitationId),
          eq(invitations.tenantId, tenantId),
          eq(invitations.status, "pending")
        )
      );

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to revoke invitation" },
      { status: 500 }
    );
  }
}
