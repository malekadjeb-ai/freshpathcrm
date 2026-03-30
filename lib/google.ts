import { google } from "googleapis";
import { getDbAsync } from "@/src/db";
import { businessSettings } from "@/src/db/schema";
import { eq } from "drizzle-orm";

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/google/callback`
  );
}

export function getAuthUrl() {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  });
}

/**
 * Get an authenticated Google OAuth2 client with auto-refresh.
 * Automatically refreshes expired tokens and persists new ones to DB.
 * Returns null if no Google credentials are configured.
 */
export async function getAuthedGoogleClient(): Promise<ReturnType<typeof getOAuth2Client> | null> {
  const db = await getDbAsync();
  const settings = await db.select({
    id: businessSettings.id,
    googleAccessToken: businessSettings.googleAccessToken,
    googleRefreshToken: businessSettings.googleRefreshToken,
    googleTokenExpiry: businessSettings.googleTokenExpiry,
    gvSyncEnabled: businessSettings.gvSyncEnabled,
  }).from(businessSettings).limit(1).then(r => r[0]);

  if (!settings?.googleAccessToken) return null;

  const client = getOAuth2Client();
  client.setCredentials({
    access_token: settings.googleAccessToken,
    refresh_token: settings.googleRefreshToken ?? undefined,
    expiry_date: settings.googleTokenExpiry ? new Date(settings.googleTokenExpiry).getTime() : undefined,
  });

  // Listen for token refresh events and persist to DB
  client.on("tokens", async (tokens) => {
    try {
      const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
      if (tokens.access_token) updateData.googleAccessToken = tokens.access_token;
      if (tokens.refresh_token) updateData.googleRefreshToken = tokens.refresh_token;
      if (tokens.expiry_date) updateData.googleTokenExpiry = new Date(tokens.expiry_date).toISOString();

      if (Object.keys(updateData).length > 1) {
        await db.update(businessSettings).set(updateData).where(eq(businessSettings.id, settings.id));
      }
    } catch (err) {
      console.error("[Google] Failed to persist refreshed tokens:", err);
    }
  });

  // Proactively refresh if token is expired or about to expire (within 5 min)
  const now = Date.now();
  const expiry = settings.googleTokenExpiry ? new Date(settings.googleTokenExpiry).getTime() : 0;
  if (expiry > 0 && expiry - now < 5 * 60 * 1000) {
    try {
      const { credentials } = await client.refreshAccessToken();
      client.setCredentials(credentials);
      await db.update(businessSettings).set({
        googleAccessToken: credentials.access_token || settings.googleAccessToken,
        googleRefreshToken: credentials.refresh_token || settings.googleRefreshToken,
        googleTokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null,
        updatedAt: new Date().toISOString(),
      }).where(eq(businessSettings.id, settings.id));
    } catch (err) {
      console.error("[Google] Token refresh failed:", err);
      return null;
    }
  }

  return client;
}
