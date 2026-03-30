import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { checkComplianceBeforeSend } from "@/lib/services/compliance";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const body = await req.json();
    const { customerId, channel, messageType } = body;

    if (!customerId || !channel) {
      return NextResponse.json({ error: "customerId and channel required" }, { status: 400 });
    }

    const result = await checkComplianceBeforeSend(
      customerId,
      channel as "sms" | "email",
      messageType || "marketing"
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Compliance check error:", error);
    return NextResponse.json({ error: "Compliance check failed" }, { status: 500 });
  }
}
