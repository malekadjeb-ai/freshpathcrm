import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { communications, businessSettings } from "@/src/db/schema";
import { eq, gte } from "drizzle-orm";

/**
 * Returns the current communication configuration status.
 * Used by the UI to show dev-mode banners and status indicators.
 */
export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const [settings] = await db.select().from(businessSettings).where(eq(businessSettings.tenantId, tenantId));

    const emailProvider = settings?.emailProvider || null;
    const emailConfigured = !!(
      (emailProvider === "resend" && process.env.RESEND_API_KEY) ||
      (emailProvider === "sendgrid" && process.env.SENDGRID_API_KEY && settings?.senderEmail) ||
      (emailProvider === "smtp" && process.env.SMTP_USER && process.env.SMTP_PASSWORD) ||
      (!emailProvider && (process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY || process.env.SMTP_USER))
    );

    const smsConfigured = !!(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    );

    // Get recent communication stats
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentComms = await db
      .select({ status: communications.status, type: communications.type })
      .from(communications)
      .where(gte(communications.createdAt, cutoff));

    const stats = {
      last24h: recentComms.length,
      sent: recentComms.filter((c) => c.status === "sent" || c.status === "delivered").length,
      devMode: recentComms.filter((c) => c.status === "logged_dev").length,
      failed: recentComms.filter((c) => c.status === "failed").length,
    };

    return NextResponse.json({
      emailConfigured,
      emailProvider: emailConfigured
        ? emailProvider || (process.env.RESEND_API_KEY ? "resend" : process.env.SENDGRID_API_KEY ? "sendgrid" : "smtp")
        : null,
      smsConfigured,
      smsProvider: smsConfigured ? "twilio" : null,
      mode: emailConfigured || smsConfigured ? "live" : "dev",
      stats,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
