import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/src/db";
import { portalSessions } from "@/src/db/schema";
import { eq, and, gte } from "drizzle-orm";

// Token-based portal access — creates a session from a unique customer token URL
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    const db = getDb();
    const session = await db.select().from(portalSessions).where(
      and(
        eq(portalSessions.token, token),
        gte(portalSessions.expiresAt, new Date().toISOString())
      )
    ).limit(1).then(r => r[0]);

    if (!session) {
      return NextResponse.json({ error: "Invalid or expired portal link" }, { status: 404 });
    }

    // Update last active
    await db.update(portalSessions).set({ lastActive: new Date().toISOString() }).where(eq(portalSessions.id, session.id));

    // Set session cookie and redirect to portal
    const response = NextResponse.redirect(new URL("/portal", req.url));
    response.cookies.set("portal-session", session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Portal token access error:", error);
    return NextResponse.json({ error: "Access failed" }, { status: 500 });
  }
}
