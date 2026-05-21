import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/src/db";
import { businessSettings } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { getQBConfig } from "@/lib/quickbooks";
import crypto from "crypto";

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
  let nonce: string;
  try {
    const state = JSON.parse(Buffer.from(stateParam, "base64url").toString("utf8"));
    tenantId = state.tenantId;
    nonce = state.nonce;
    if (!tenantId || !nonce) throw new Error("Missing state fields");
    if (!state.ts || Date.now() - state.ts > 10 * 60 * 1000) throw new Error("State expired");
  } catch {
    return NextResponse.redirect(
      new URL("/settings?integration=quickbooks-error&reason=invalid_state", req.url)
    );
  }

  // CSRF: verify nonce matches the cookie set during connect.
  // Length check first — timingSafeEqual throws on length mismatch.
  const cookieNonce = req.cookies.get("qb-oauth-nonce")?.value;
  const cookieBuf = cookieNonce ? Buffer.from(cookieNonce) : null;
  const nonceBuf = Buffer.from(nonce);
  if (
    !cookieBuf ||
    cookieBuf.length !== nonceBuf.length ||
    !crypto.timingSafeEqual(cookieBuf, nonceBuf)
  ) {
    return NextResponse.redirect(
      new URL("/settings?integration=quickbooks-error&reason=csrf_failed", req.url)
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

  const successResponse = NextResponse.redirect(
    new URL("/settings?integration=quickbooks-success", req.url)
  );
  successResponse.cookies.delete("qb-oauth-nonce");
  return successResponse;
}
