import { NextResponse } from "next/server";
import { requireAuthWithPermission } from "@/lib/require-permission";
import { getQBConfig } from "@/lib/quickbooks";

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

  const state = Buffer.from(
    JSON.stringify({ tenantId: auth.tenantId, ts: Date.now() })
  ).toString("base64url");

  const params = new URLSearchParams({
    client_id: config.clientId,
    scope: "com.intuit.quickbooks.accounting",
    redirect_uri: config.redirectUri,
    response_type: "code",
    state,
  });

  const url = `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`;

  return NextResponse.json({ url });
}
