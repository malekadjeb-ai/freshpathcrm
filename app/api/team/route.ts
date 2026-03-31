import { NextResponse } from "next/server";
import { requireAuthWithPermission } from "@/lib/require-permission";
import { getDb } from "@/src/db";
import { users } from "@/src/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const auth = await requireAuthWithPermission("users:read");
    if ("error" in auth) return auth.error;
    const { tenantId } = auth;

    const db = getDb();
    const teamMembers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.tenantId, tenantId));

    return NextResponse.json(teamMembers);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch team" },
      { status: 500 }
    );
  }
}
