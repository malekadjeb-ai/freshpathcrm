import { NextResponse } from "next/server";
import { processScheduledMessages } from "@/lib/services/scheduled-messages";

/**
 * GET /api/cron/process-messages
 * Processes due scheduled messages (confirmations, reminders, follow-ups).
 * Called by client-side polling or external cron (e.g., Vercel Cron).
 */
export async function GET() {
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
