import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/src/db";
import { customers, communications, users, notifications } from "@/src/db/schema";
import { eq, or, like } from "drizzle-orm";

/**
 * POST /api/webhooks/twilio/inbound
 * Receives inbound SMS messages from Twilio and records them as communications.
 * This enables two-way messaging: customers can reply to SMS and it appears in conversations.
 */
export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);

    const from = params.get("From"); // e.g. "+15551234567"
    const body = params.get("Body") || "";
    const messageSid = params.get("MessageSid");
    const numMedia = parseInt(params.get("NumMedia") || "0", 10);

    if (!from || !messageSid) {
      return twimlResponse("Missing required fields");
    }

    // Normalize phone number for lookup
    const normalizedPhone = from.replace(/\D/g, "").slice(-10);

    // Try to find customer by phone
    const allCustomers = await db
      .select()
      .from(customers)
      .where(
        or(
          like(customers.phone, `%${normalizedPhone}%`),
          eq(customers.phone, from)
        )
      );
    const customer = allCustomers.find((c) => c.deletedAt === null) ?? null;

    // Build media URLs if any
    const mediaUrls: string[] = [];
    for (let i = 0; i < numMedia; i++) {
      const url = params.get(`MediaUrl${i}`);
      if (url) mediaUrls.push(url);
    }

    const fullBody = mediaUrls.length > 0
      ? `${body}\n\n[Attachments: ${mediaUrls.join(", ")}]`
      : body;

    // Auto-create customer if not found
    let customerId = customer?.id;
    if (!customerId) {
      const [newCustomer] = await db.insert(customers).values({
        name: from || "Unknown",
        phone: from,
        source: "SMS Inbound",
        lifecycleStage: "New",
      }).returning();
      customerId = newCustomer.id;
    }

    // Create communication record
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

    // Update customer last contacted
    await db.update(customers)
      .set({ lastContactedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .where(eq(customers.id, customerId));

    // Create a notification for the team
    const allUsers = await db.select({ id: users.id }).from(users);
    const senderName = customer?.name || from;

    for (const user of allUsers) {
      await db.insert(notifications).values({
        userId: user.id,
        title: `New SMS from ${senderName}`,
        message: fullBody.length > 100 ? fullBody.substring(0, 100) + "..." : fullBody,
        type: "info",
        link: `/conversations?customerId=${customerId}`,
      });
    }

    // Respond with empty TwiML (acknowledge receipt)
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
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
