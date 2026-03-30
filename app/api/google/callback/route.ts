import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { businessSettings } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { getOAuth2Client } from "@/lib/google";
import { google } from "googleapis";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return NextResponse.redirect(new URL("/login", req.url));
  const { session: _session, tenantId } = auth;

  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/settings?error=no_code", req.url));

  try {
    const client = getOAuth2Client();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Get user email
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email;

    // Store tokens in BusinessSettings
    const db = getDb();
    const settings = await db.select().from(businessSettings).limit(1).then(r => r[0]);
    if (settings) {
      await db.update(businessSettings).set({
        googleAccessToken: tokens.access_token ?? null,
        googleRefreshToken: tokens.refresh_token ?? null,
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        googleEmail: email ?? null,
        gvSyncEnabled: true,
        updatedAt: new Date().toISOString(),
      }).where(eq(businessSettings.id, settings.id));
    }

    return NextResponse.redirect(new URL("/settings?tab=integrations&google=connected", req.url));
  } catch {
    return NextResponse.redirect(new URL("/settings?tab=integrations&google=error", req.url));
  }
}
