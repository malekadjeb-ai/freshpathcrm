import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/src/db";
import { communications, campaigns, campaignRecipients } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// Twilio status values mapped to our internal statuses
const STATUS_MAP: Record<string, string> = {
  queued: "queued",
  sent: "sent",
  delivered: "delivered",
  undelivered: "failed",
  failed: "failed",
};

function validateTwilioSignature(
  req: NextRequest,
  body: string,
  authToken: string
): boolean {
  const signature = req.headers.get("x-twilio-signature");
  if (!signature) return false;

  const url = req.url;
  const params = new URLSearchParams(body);
  const sortedParams = Array.from(params.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  const data = url + sortedParams.map(([k, v]) => k + v).join("");

  const expected = crypto
    .createHmac("sha1", authToken)
    .update(data)
    .digest("base64");

  return signature === expected;
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);

    const messageSid = params.get("MessageSid");
    const messageStatus = params.get("MessageStatus");
    const errorCode = params.get("ErrorCode");

    if (!messageSid || !messageStatus) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Validate signature if Twilio auth token is configured
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    if (twilioAuthToken) {
      const valid = validateTwilioSignature(req, bodyText, twilioAuthToken);
      if (!valid) {
        console.warn("Invalid Twilio webhook signature");
        return new NextResponse("Invalid signature", { status: 403 });
      }
    }

    const internalStatus = STATUS_MAP[messageStatus] || messageStatus;
    const now = new Date().toISOString();

    // Update Communication record by externalId (Twilio SID)
    const allComms = await db
      .select()
      .from(communications)
      .where(eq(communications.externalId, messageSid));
    const communication = allComms[0] ?? null;

    if (communication) {
      const updateData: Record<string, unknown> = {
        status: internalStatus,
        updatedAt: now,
      };

      if (messageStatus === "delivered") {
        updateData.deliveredAt = now;
      }
      if (messageStatus === "failed" || messageStatus === "undelivered") {
        updateData.outcome = errorCode
          ? `error_${errorCode}`
          : "delivery_failed";
      }

      await db.update(communications).set(updateData).where(eq(communications.id, communication.id));

      // Update CampaignRecipient if this was part of a campaign
      if (communication.campaignId && communication.customerId) {
        await updateCampaignRecipientStatus(
          communication.campaignId,
          communication.customerId,
          "sms",
          internalStatus
        );
      }
    }

    // Return 200 to acknowledge receipt — Twilio expects this
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Twilio webhook error:", error);
    return new NextResponse("OK", { status: 200 });
  }
}

async function updateCampaignRecipientStatus(
  campaignId: string,
  customerId: string,
  channel: string,
  status: string
) {
  const db = getDb();
  const allRecipients = await db
    .select()
    .from(campaignRecipients)
    .where(eq(campaignRecipients.campaignId, campaignId));

  const recipient = allRecipients.find(
    (r) => r.customerId === customerId && r.channel === channel
  ) ?? null;

  if (!recipient) return;

  const updateData: Record<string, unknown> = {};

  if (status === "delivered" || status === "sent") {
    if (recipient.status === "pending" || recipient.status === "sent") {
      updateData.status = status;
    }
  } else if (status === "failed") {
    updateData.status = "failed";
    updateData.error = "Delivery failed";
  }

  if (Object.keys(updateData).length > 0) {
    await db.update(campaignRecipients).set(updateData).where(eq(campaignRecipients.id, recipient.id));
    await recalculateCampaignCounts(campaignId);
  }
}

async function recalculateCampaignCounts(campaignId: string) {
  const db = getDb();
  const recipients = await db
    .select()
    .from(campaignRecipients)
    .where(eq(campaignRecipients.campaignId, campaignId));

  const counts = {
    sentCount: recipients.filter((r) =>
      ["sent", "delivered", "opened", "clicked", "converted"].includes(r.status)
    ).length,
    failedCount: recipients.filter((r) => r.status === "failed").length,
    openedCount: recipients.filter((r) =>
      ["opened", "clicked", "converted"].includes(r.status)
    ).length,
    clickedCount: recipients.filter((r) =>
      ["clicked", "converted"].includes(r.status)
    ).length,
    convertedCount: recipients.filter((r) => r.status === "converted").length,
    updatedAt: new Date().toISOString(),
  };

  await db.update(campaigns).set(counts).where(eq(campaigns.id, campaignId));
}
