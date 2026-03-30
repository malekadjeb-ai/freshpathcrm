import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/src/db";
import { businessSettings } from "@/src/db/schema";

/**
 * POST /api/webhooks/twilio/voice/connect
 * TwiML endpoint that Twilio calls when a call is answered.
 * For outbound calls: connects to the customer's phone.
 * For inbound calls: forwards to the business phone.
 */
export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);

    const direction = params.get("Direction");
    const to = params.get("To");

    const [settings] = await db.select().from(businessSettings).limit(1);
    const businessPhone = settings?.phone || "";

    let twiml: string;

    if (direction === "inbound") {
      // Inbound call: forward to business phone
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling ${escapeXml(settings?.businessName || "us")}. Please hold while we connect you.</Say>
  <Dial record="record-from-answer-dual" timeout="30">
    <Number>${escapeXml(businessPhone)}</Number>
  </Dial>
  <Say>Sorry, no one is available to take your call. Please leave a message after the beep.</Say>
  <Record maxLength="120" action="/api/webhooks/twilio/voice/voicemail" transcribe="true" />
</Response>`;
    } else {
      // Outbound call: connect to the dialed number
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial record="record-from-answer-dual" timeout="30">
    <Number>${escapeXml(to || "")}</Number>
  </Dial>
</Response>`;
    }

    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("Twilio voice connect error:", error);
    const fallback = `<?xml version="1.0" encoding="UTF-8"?><Response><Say>An error occurred. Please try again later.</Say></Response>`;
    return new NextResponse(fallback, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}

function escapeXml(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
