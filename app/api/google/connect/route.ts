import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAuthUrl } from "@/lib/google";

export async function GET() {
  const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

  const url = getAuthUrl();
  return NextResponse.redirect(url);
}
