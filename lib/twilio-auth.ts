import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

/**
 * Verifies the X-Twilio-Signature header so unauthenticated callers can't
 * spoof inbound SMS/voice events. Twilio signs the full request URL +
 * sorted form params with the account's auth token (HMAC-SHA1).
 *
 * Returns null on success, a 401 NextResponse on failure.
 *
 * Pass the raw form-encoded body (already read with req.text()) so we can
 * parse params without consuming the stream again.
 */
export function verifyTwilioSignature(
  req: NextRequest,
  rawBody: string,
): NextResponse | null {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    return NextResponse.json(
      { error: "Twilio webhook not configured" },
      { status: 500 },
    );
  }

  if (process.env.SKIP_TWILIO_VERIFY === "true") return null;

  const signature = req.headers.get("x-twilio-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const url = publicRequestUrl(req);
  const params: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(rawBody)) params[k] = v;

  const valid = twilio.validateRequest(authToken, signature, url, params);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  return null;
}

function publicRequestUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const { pathname, search } = req.nextUrl;
  return `${proto}://${host}${pathname}${search}`;
}
