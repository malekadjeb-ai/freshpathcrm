import { NextResponse } from "next/server";
import { getDb } from "@/src/db";
import { businessSettings, communications, tasks, users, notifications } from "@/src/db/schema";
import { eq, and, gte, inArray, or } from "drizzle-orm";
import { getAuthedGoogleClient } from "@/lib/google";
import { syncGoogleVoiceFromGmail } from "@/lib/services/gmail-voice-sync";
import { syncLSALeadsFromGmail } from "@/lib/services/gmail-lsa-sync";
import { subHours, subDays } from "date-fns";

/**
 * GET /api/cron/sync-voice
 * Auto-syncs Google Voice communications from Gmail.
 */
export async function GET() {
  try {
    const db = getDb();
    const settings = await db.select({
      id: businessSettings.id,
      googleAccessToken: businessSettings.googleAccessToken,
      googleRefreshToken: businessSettings.googleRefreshToken,
      gvSyncEnabled: businessSettings.gvSyncEnabled,
      gvAutoSyncMinutes: businessSettings.gvAutoSyncMinutes,
      gvLastSyncAt: businessSettings.gvLastSyncAt,
    }).from(businessSettings).limit(1).then(r => r[0]);

    if (!settings?.gvSyncEnabled || !settings.googleAccessToken) {
      return NextResponse.json({ skipped: true, reason: "sync not enabled or no Google account" });
    }

    const client = await getAuthedGoogleClient();
    if (!client) {
      return NextResponse.json({ skipped: true, reason: "Google auth expired" });
    }

    const sinceDate = settings.gvLastSyncAt
      ? subHours(new Date(settings.gvLastSyncAt), 1)
      : subDays(new Date(), 7);

    const [result, lsaResult] = await Promise.all([
      syncGoogleVoiceFromGmail(client, sinceDate),
      syncLSALeadsFromGmail(client, sinceDate),
    ]);

    await db.update(businessSettings).set({
      gvLastSyncAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).where(eq(businessSettings.id, settings.id));

    if (result.imported > 0) {
      await createAutoTasks(sinceDate);
      await createAutoNotifications(result.imported);
    }

    if (lsaResult.imported > 0) {
      await createLSANotifications(lsaResult.imported);
    }

    return NextResponse.json({
      success: true,
      voiceSync: result,
      lsaSync: lsaResult,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    console.error("[Auto GV Sync] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function createAutoTasks(since: Date) {
  try {
    const db = getDb();
    const sinceIso = since.toISOString();

    const missedComms = await db.select().from(communications).where(
      and(
        eq(communications.source, "google_voice_gmail"),
        gte(communications.createdAt, sinceIso),
        or(
          eq(communications.direction, "missed"),
          eq(communications.type, "voicemail")
        )
      )
    );

    const oneDayAgo = subHours(new Date(), 24).toISOString();

    for (const comm of missedComms) {
      const contactCustomerId = comm.customerId;
      const contactLeadId = comm.leadId;

      // Check if task already exists for this contact in last 24h
      const existingTasks = await db.select().from(tasks).where(
        and(
          contactCustomerId ? eq(tasks.customerId, contactCustomerId) : undefined,
          eq(tasks.completed, false),
          gte(tasks.createdAt, oneDayAgo)
        )
      ).limit(1);

      if (existingTasks.length > 0) continue;

      const isVoicemail = comm.type === "voicemail";
      const isLead = !!contactLeadId && !contactCustomerId;
      const contactName = "Unknown";
      const taskTitle = isVoicemail
        ? `Listen to voicemail from ${contactName}${isLead ? " (New Lead)" : ""}`
        : `Call back ${contactName}${isLead ? " (New Lead)" : ""}`;

      const dueDate = new Date();
      dueDate.setMinutes(dueDate.getMinutes() + 30);

      await db.insert(tasks).values({
        title: taskTitle,
        type: "call_back",
        priority: "high",
        dueDate: dueDate.toISOString(),
        customerId: contactCustomerId ?? null,
        leadId: contactLeadId ?? null,
      });
    }
  } catch (err) {
    console.error("[Auto Tasks] Error:", err);
  }
}

async function createAutoNotifications(importedCount: number) {
  try {
    const db = getDb();
    const allUsers = await db.select({ id: users.id }).from(users);

    for (const user of allUsers) {
      await db.insert(notifications).values({
        userId: user.id,
        type: "gv_sync",
        title: "Google Voice Synced",
        message: `${importedCount} new message${importedCount === 1 ? "" : "s"} synced from Google Voice`,
        link: "/conversations",
      });
    }
  } catch (err) {
    console.error("[Auto Notifications] Error:", err);
  }
}

async function createLSANotifications(importedCount: number) {
  try {
    const db = getDb();
    const allUsers = await db.select({ id: users.id }).from(users);

    for (const user of allUsers) {
      await db.insert(notifications).values({
        userId: user.id,
        type: "lsa_lead",
        title: "New LSA Lead" + (importedCount > 1 ? "s" : ""),
        message: `${importedCount} new lead${importedCount === 1 ? "" : "s"} from Google Local Service Ads`,
        link: "/leads",
      });
    }
  } catch (err) {
    console.error("[LSA Notifications] Error:", err);
  }
}
