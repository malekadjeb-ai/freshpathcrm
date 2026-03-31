import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { processScheduledMessages } from "@/lib/services/scheduled-messages";

export async function POST() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    const results = await processScheduledMessages();
    return NextResponse.json({ processed: results.length, results });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
