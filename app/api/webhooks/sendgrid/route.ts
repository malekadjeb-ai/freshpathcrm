import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/src/db";
import { communications, campaignRecipients, campaigns } from "@/src/db/schema";
import { eq, gte, desc } from "drizzle-orm";

// SendGrid Event Webhook sends an array of event objects
interface SendGridEvent {
  email: string;
  timestamp: number;
  event: string; // delivered, open, click, bounce, dropped, deferred, spam_report, unsubscribe
  sg_message_id?: string;
  url?: string; // For click events
  reason?: string; // For bounce/dropped
  status?: string;
  type?: string; // For bounce: "bounce" or "blocked"
}

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text();
    let events: SendGridEvent[];

    try {
      events = JSON.parse(bodyText);
    } catch {
      return new NextResponse("Invalid JSON", { status: 400 });
    }

    if (!Array.isArray(events) || events.length === 0) {
      return new NextResponse("No events", { status: 400 });
    }

    // Process each event
    for (const event of events) {
      await processEvent(event);
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("SendGrid webhook error:", error);
    // Return 200 to prevent SendGrid from retrying
    return new NextResponse("OK", { status: 200 });
  }
}

async function processEvent(event: SendGridEvent) {
  const db = getDb();
  // SendGrid message IDs have a format like "abc123.filter0001.12345.abc@domain"
  const sgMessageId = event.sg_message_id?.split(".")[0];
  const now = new Date().toISOString();

  // Find the Communication record by externalId
  let communication = null;
  if (sgMessageId) {
    const results = await db
      .select()
      .from(communications)
      .where(eq(communications.externalId, sgMessageId));
    communication = results[0] ?? null;
  }

  // Fallback: find by email address for recent communications
  if (!communication && event.email) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const results = await db
      .select()
      .from(communications)
      .where(gte(communications.createdAt, sevenDaysAgo))
      .orderBy(desc(communications.createdAt))
      .limit(1);
    // Only use as fallback if it's an outbound email
    const candidate = results.find((c) => c.type === "email" && c.direction === "outbound");
    communication = candidate ?? null;
  }

  if (!communication) return;

  const updateData: Record<string, unknown> = { updatedAt: now };

  switch (event.event) {
    case "delivered":
      updateData.status = "delivered";
      updateData.deliveredAt = now;
      break;

    case "open":
      updateData.openedAt = communication.openedAt || now; // Keep first open time
      if (communication.status !== "clicked") {
        updateData.status = "opened";
      }
      break;

    case "click":
      updateData.clickedAt = communication.clickedAt || now;
      updateData.status = "clicked";
      break;

    case "bounce":
    case "dropped":
      updateData.status = "bounced";
      updateData.bouncedAt = now;
      updateData.outcome = event.reason || event.type || "bounce";
      break;

    case "deferred":
      updateData.status = "deferred";
      break;

    case "spam_report":
      updateData.status = "spam";
      break;

    case "unsubscribe":
      updateData.status = "unsubscribed";
      break;

    default:
      return; // Unknown event, skip
  }

  if (Object.keys(updateData).length > 1) { // > 1 because updatedAt is always set
    await db.update(communications).set(updateData).where(eq(communications.id, communication.id));

    // Update CampaignRecipient if this was part of a campaign
    if (communication.campaignId && communication.customerId) {
      await updateCampaignRecipient(
        communication.campaignId,
        communication.customerId,
        "email",
        event.event,
        now,
        event.reason
      );
    }
  }
}

async function updateCampaignRecipient(
  campaignId: string,
  customerId: string,
  channel: string,
  eventType: string,
  timestamp: string,
  error?: string
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

  // Status progression: pending → sent → delivered → opened → clicked → converted
  const statusOrder = ["pending", "sent", "delivered", "opened", "clicked", "converted"];
  const currentIdx = statusOrder.indexOf(recipient.status);

  switch (eventType) {
    case "delivered": {
      const deliveredIdx = statusOrder.indexOf("delivered");
      if (currentIdx < deliveredIdx) {
        updateData.status = "delivered";
      }
      break;
    }
    case "open": {
      const openIdx = statusOrder.indexOf("opened");
      if (currentIdx < openIdx) {
        updateData.status = "opened";
        updateData.openedAt = recipient.openedAt || timestamp;
      }
      break;
    }
    case "click": {
      const clickIdx = statusOrder.indexOf("clicked");
      if (currentIdx < clickIdx) {
        updateData.status = "clicked";
        updateData.clickedAt = recipient.clickedAt || timestamp;
      }
      break;
    }
    case "bounce":
    case "dropped":
      updateData.status = "failed";
      updateData.error = error || "Bounced";
      break;
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
