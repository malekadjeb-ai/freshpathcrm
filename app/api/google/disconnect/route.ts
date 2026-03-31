import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { businessSettings } from "@/src/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

  const db = getDb();
  const settings = await db.select().from(businessSettings).limit(1).then(r => r[0]);
  if (settings) {
    await db.update(businessSettings).set({
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiry: null,
      googleEmail: null,
      gvSyncEnabled: false,
      gvLastSyncAt: null,
      updatedAt: new Date().toISOString(),
    }).where(eq(businessSettings.id, settings.id));
  }

  return NextResponse.json({ success: true });
}
