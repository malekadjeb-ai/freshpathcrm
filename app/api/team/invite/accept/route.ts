import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/src/db";
import { invitations, users } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, name, password } = body as {
      token?: string;
      name?: string;
      password?: string;
    };

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }
    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: "Name is required (min 2 characters)" }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const db = getDb();

    const invitation = await db
      .select()
      .from(invitations)
      .where(and(eq(invitations.token, token), eq(invitations.status, "pending")))
      .limit(1)
      .then((r) => r[0]);

    if (!invitation) {
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 404 });
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      await db
        .update(invitations)
        .set({ status: "expired" })
        .where(eq(invitations.id, invitation.id));
      return NextResponse.json({ error: "This invitation has expired" }, { status: 410 });
    }

    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, invitation.email), eq(users.tenantId, invitation.tenantId)))
      .limit(1)
      .then((r) => r[0]);

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists on this team" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await db.insert(users).values({
      name: name.trim(),
      email: invitation.email,
      password: hashedPassword,
      role: invitation.role,
      tenantId: invitation.tenantId,
    });

    await db
      .update(invitations)
      .set({ status: "accepted", acceptedAt: new Date().toISOString() })
      .where(eq(invitations.id, invitation.id));

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to accept invitation" },
      { status: 500 }
    );
  }
}
