import { NextResponse } from "next/server";
import { requireAuth } from "./auth";
import { hasPermission, type Role, type Permission } from "./permissions";

export async function requireAuthWithPermission(permission: Permission) {
  const auth = await requireAuth();
  if ("error" in auth) return auth;

  const role = ((auth.session.user as Record<string, unknown>).role as string) || "VIEWER";
  if (!hasPermission(role as Role, permission)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return auth;
}
