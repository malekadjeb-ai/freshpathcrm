import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/src/db";
import { businessSettings } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { getQBConfig } from "@/lib/quickbooks";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const realmId = url.searchParams.get("realmId");
  const stateParam = url.searchParams.get("state");

  if (!code || !realmId || !stateParam) {
    return NextResponse.redirect(
      new URL("/settings?integration=quickbooks-error&reason=missing_params", req.url)
    );
  }

  let tenantId: string;
  try {
    const state = JSON.parse(
      Buffer.from(stateParam, "base64url").toString("utf8")
    );
    tenantId = state.tenantId;
    if (!tenantId) throw new Error("No tenantId in state");
  } catch {
    return NextResponse.redirect(
      new URL("/settings?integration=quickbooks-error&reason=invalid_state", req.url)
    );
  }

  const config = getQBConfig();
  if (!config.clientId || !config.clientSecret || !config.redirectUri) {
    return NextResponse.redirect(
      new URL("/settings?integration=quickbooks-error&reason=not_configured", req.url)
    );
  }

  const tokenRes = await fetch(
    "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: config.redirectUri,
      }),
    }
  );

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      new URL("/settings?integration=quickbooks-error&reason=token_exchange_failed", req.url)
    );
  }

  const tokens = await tokenRes.json();
  const expiresAt = new Date(
    Date.now() + tokens.expires_in * 1000
  ).toISOString();

  const db = getDb();
  await db
    .update(businessSettings)
    .set({
      qbAccessToken: tokens.access_token,
      qbRefreshToken: tokens.refresh_token,
      qbRealmId: realmId,
      qbTokenExpiry: expiresAt,
      qbSyncEnabled: true,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(businessSettings.tenantId, tenantId));

  return NextResponse.redirect(
    new URL("/settings?integration=quickbooks-success", req.url)
  );
}
