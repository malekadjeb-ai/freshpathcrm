import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getComplianceStats } from "@/lib/services/compliance";

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const stats = await getComplianceStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Compliance stats error:", error);
    return NextResponse.json({ error: "Failed to get stats" }, { status: 500 });
  }
}
