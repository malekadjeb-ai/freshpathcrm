import { NextResponse } from "next/server";
import { requireAuthWithPermission } from "@/lib/require-permission";
import { getQBConfig } from "@/lib/quickbooks";
import crypto from "crypto";

export async function GET() {
  const auth = await requireAuthWithPermission("billing:write");
  if ("error" in auth) return auth.error;

  const config = getQBConfig();
  if (!config.clientId || !config.redirectUri) {
    return NextResponse.json(
      { error: "QuickBooks integration not configured" },
      { status: 500 }
    );
  }

  // CSRF nonce — stored in a short-lived httpOnly cookie and embedded in state
  const nonce = crypto.randomBytes(16).toString("hex");

  const state = Buffer.from(
    JSON.stringify({ tenantId: auth.tenantId, nonce, ts: Date.now() })
  ).toString("base64url");

  const params = new URLSearchParams({
    client_id: config.clientId,
    scope: "com.intuit.quickbooks.accounting",
    redirect_uri: config.redirectUri,
    response_type: "code",
    state,
  });

  const url = `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`;

  const response = NextResponse.json({ url });
  response.cookies.set("qb-oauth-nonce", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60, // 10 minutes
    path: "/",
  });

  return response;
}
