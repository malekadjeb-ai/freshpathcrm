import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { applyExtractedData } from "@/lib/services/auto-capture";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    const body = await req.json();
    const { customerId, extracted } = body;

    if (!customerId || !extracted) {
      return NextResponse.json({ error: "customerId and extracted data required" }, { status: 400 });
    }

    const result = await applyExtractedData(customerId, extracted);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Apply extracted error:", error);
    return NextResponse.json({ error: "Failed to apply extracted data" }, { status: 500 });
  }
}
