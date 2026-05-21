import { NextRequest, NextResponse } from "next/server";
import { processScheduledMessages } from "@/lib/services/scheduled-messages";
import { verifyCronRequest } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = verifyCronRequest(req);
  if (denied) return denied;
  try {
    const results = await processScheduledMessages();
    return NextResponse.json({
      processed: results.length,
      sent: results.filter((r) => r.status === "sent").length,
      failed: results.filter((r) => r.status === "failed").length,
    });
  } catch (err) {
    console.error("[CRON] Process messages error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
