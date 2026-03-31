import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { businessSettings, communications } from "@/src/db/schema";
import { eq, inArray, and, gte } from "drizzle-orm";
import { getAuthedGoogleClient } from "@/lib/google";
import { syncGoogleVoiceFromGmail } from "@/lib/services/gmail-voice-sync";
import { subDays, subHours } from "date-fns";

/**
 * POST /api/google/sync
 * Triggers a Google Voice sync from Gmail.
 * Automatically handles token refresh.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    const db = getDb();
    const settings = await db.select({
      id: businessSettings.id,
      googleAccessToken: businessSettings.googleAccessToken,
      googleRefreshToken: businessSettings.googleRefreshToken,
      gvSyncEnabled: businessSettings.gvSyncEnabled,
      gvLastSyncAt: businessSettings.gvLastSyncAt,
    }).from(businessSettings).limit(1).then(r => r[0]);

    if (!settings?.googleAccessToken) {
      return NextResponse.json({
        error: "Google account not connected. Please connect in Settings > Integrations.",
        reconnect: true,
      }, { status: 400 });
    }

    // Get authed client (handles token refresh automatically)
    const client = await getAuthedGoogleClient();
    if (!client) {
      return NextResponse.json({
        error: "Google token expired. Please reconnect your Google account.",
        reconnect: true,
      }, { status: 401 });
    }

    // Determine sync window
    const body = await req.json().catch(() => ({}));
    const lookbackDays = body.lookbackDays || 7;
    const forceFullSync = body.forceFullSync === true;

    let sinceDate: Date;
    if (forceFullSync || !settings.gvLastSyncAt) {
      // First sync or forced: go back as far as requested (max 90 days)
      sinceDate = subDays(new Date(), Math.min(lookbackDays, 90));
    } else {
      // Incremental: go back to last sync minus 4 hours overlap
      sinceDate = subHours(new Date(settings.gvLastSyncAt), 4);
    }

    const result = await syncGoogleVoiceFromGmail(client, sinceDate);

    // Update last sync time
    await db.update(businessSettings).set({
      gvLastSyncAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).where(eq(businessSettings.id, settings.id));

    return NextResponse.json({
      success: true,
      ...result,
      syncWindow: sinceDate.toISOString(),
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    console.error("[GV Sync] Error:", message);

    if (message.includes("invalid_grant") || message.includes("Token has been expired") || message.includes("Invalid Credentials")) {
      return NextResponse.json({
        error: "Google authentication expired. Please reconnect your Google account.",
        reconnect: true,
      }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/google/sync
 * Returns sync status and stats.
 */
export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    const db = getDb();
    const settings = await db.select({
      googleEmail: businessSettings.googleEmail,
      googleAccessToken: businessSettings.googleAccessToken,
      googleRefreshToken: businessSettings.googleRefreshToken,
      gvSyncEnabled: businessSettings.gvSyncEnabled,
      gvLastSyncAt: businessSettings.gvLastSyncAt,
      googleTokenExpiry: businessSettings.googleTokenExpiry,
    }).from(businessSettings).limit(1).then(r => r[0]);

    if (!settings || !settings.googleEmail) {
      return NextResponse.json({ connected: false });
    }

    const tokenExpiry = settings.googleTokenExpiry ? new Date(settings.googleTokenExpiry).getTime() : 0;
    const tokenValid = tokenExpiry === 0 || tokenExpiry > Date.now();
    const hasRefreshToken = !!settings.googleRefreshToken;

    const gvSources = ["google_voice_gmail", "google_voice_import"];
    const oneDayAgo = subDays(new Date(), 1).toISOString();

    const [totalSynced, last24h, callCount, smsCount, voicemailCount] = await Promise.all([
      db.select().from(communications).where(inArray(communications.source, gvSources)).then(r => r.length),
      db.select().from(communications).where(and(inArray(communications.source, gvSources), gte(communications.createdAt, oneDayAgo))).then(r => r.length),
      db.select().from(communications).where(and(eq(communications.source, "google_voice_gmail"), eq(communications.type, "call"))).then(r => r.length),
      db.select().from(communications).where(and(eq(communications.source, "google_voice_gmail"), eq(communications.type, "sms"))).then(r => r.length),
      db.select().from(communications).where(and(eq(communications.source, "google_voice_gmail"), eq(communications.type, "voicemail"))).then(r => r.length),
    ]);

    return NextResponse.json({
      connected: true,
      email: settings.googleEmail,
      syncEnabled: settings.gvSyncEnabled,
      lastSyncAt: settings.gvLastSyncAt,
      tokenExpiry: settings.googleTokenExpiry,
      tokenValid: tokenValid || hasRefreshToken,
      totalSynced,
      last24h,
      breakdown: { calls: callCount, sms: smsCount, voicemails: voicemailCount },
    });
  } catch {
    return NextResponse.json({ error: "Failed to get status" }, { status: 500 });
  }
}
