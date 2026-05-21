import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/src/db";
import { customers, communications, users, notifications, businessSettings } from "@/src/db/schema";
import { eq, or, like, and, isNull } from "drizzle-orm";
import { verifyTwilioSignature } from "@/lib/twilio-auth";

/**
 * POST /api/webhooks/twilio/inbound
 * Receives inbound SMS messages from Twilio. Signature is verified against
 * TWILIO_AUTH_TOKEN before any DB writes happen.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const denied = verifyTwilioSignature(req, rawBody);
  if (denied) return denied;

  try {
    const db = getDb();

    const settingsRow = await db
      .select({ tenantId: businessSettings.tenantId })
      .from(businessSettings)
      .limit(1)
      .then((r) => r[0]);

    const params = new URLSearchParams(rawBody);
    const from = params.get("From");
    const body = params.get("Body") ?? "";
    const messageSid = params.get("MessageSid");
    const numMedia = parseInt(params.get("NumMedia") ?? "0", 10);

    if (!from || !messageSid) {
      return twimlResponse("Missing required fields");
    }

    const normalizedPhone = from.replace(/\D/g, "").slice(-10);

    const phoneFilter = or(
      like(customers.phone, `%${normalizedPhone}%`),
      eq(customers.phone, from),
    );
    const where = settingsRow
      ? and(eq(customers.tenantId, settingsRow.tenantId), phoneFilter, isNull(customers.deletedAt))
      : and(phoneFilter, isNull(customers.deletedAt));

    const customer = await db
      .select()
      .from(customers)
      .where(where)
      .limit(1)
      .then((r) => r[0] ?? null);

    const mediaUrls: string[] = [];
    for (let i = 0; i < numMedia; i++) {
      const url = params.get(`MediaUrl${i}`);
      if (url) mediaUrls.push(url);
    }

    const fullBody =
      mediaUrls.length > 0
        ? `${body}\n\n[Attachments: ${mediaUrls.join(", ")}]`
        : body;

    let customerId = customer?.id;
    if (!customerId) {
      if (!settingsRow) {
        // No tenant configured — drop the message to avoid orphaned data
        return twimlResponse("");
      }
      const [newCustomer] = await db
        .insert(customers)
        .values({
          name: from,
          phone: from,
          source: "SMS Inbound",
          lifecycleStage: "New",
          tenantId: settingsRow.tenantId,
        })
        .returning();
      customerId = newCustomer.id;
    }

    await db.insert(communications).values({
      customerId,
      type: "sms",
      direction: "inbound",
      status: "received",
      summary: fullBody.length > 200 ? fullBody.substring(0, 200) + "..." : fullBody,
      body: fullBody,
      externalId: messageSid,
      channel: "sms",
      source: "twilio_inbound",
    });

    await db
      .update(customers)
      .set({ lastContactedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .where(eq(customers.id, customerId));

    const allUsers = await db.select({ id: users.id }).from(users);
    if (allUsers.length > 0) {
      const senderName = customer?.name ?? from;
      const preview = fullBody.length > 100 ? fullBody.substring(0, 100) + "..." : fullBody;
      await db.insert(notifications).values(
        allUsers.map((u) => ({
          userId: u.id,
          title: `New SMS from ${senderName}`,
          message: preview,
          type: "info",
          link: `/conversations?customerId=${customerId}`,
        })),
      );
    }

    return twimlResponse("");
  } catch (error) {
    console.error("Twilio inbound webhook error:", error);
    return twimlResponse("");
  }
}

function twimlResponse(message: string) {
  const twiml = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

function escapeXml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
