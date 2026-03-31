import { NextResponse } from "next/server";
import { requireAuth } from "./auth";

// Extracts the tenantId from the authenticated session.
// Returns the tenantId string on success, or a NextResponse error to return directly.
export async function getTenantId(): Promise<string | NextResponse<unknown>> {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error as NextResponse<unknown>;
  return auth.tenantId;
}
