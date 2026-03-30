import { getDb } from "@/src/db";
import { consentRecords, communications, customers, users, notifications } from "@/src/db/schema";
import { eq, and, gte } from "drizzle-orm";

interface ComplianceResult {
  allowed: boolean;
  reason?: string;
  warnings: string[];
}

const OPT_OUT_KEYWORDS = [
  "STOP",
  "UNSUBSCRIBE",
  "CANCEL",
  "QUIT",
  "END",
  "OPT OUT",
  "REMOVE",
  "NO MORE",
];

const OPT_OUT_PHRASES = [
  "stop texting",
  "stop messaging",
  "don't text",
  "don't contact",
  "dont text",
  "dont contact",
  "take me off",
  "remove me",
  "no more texts",
  "no more messages",
  "leave me alone",
  "please stop",
];

export async function checkComplianceBeforeSend(
  customerId: string,
  channel: "sms" | "email",
  messageType: "transactional" | "marketing" = "marketing"
): Promise<ComplianceResult> {
  const db = getDb();
  const warnings: string[] = [];

  // 1. Check consent
  const consentRows = await db
    .select()
    .from(consentRecords)
    .where(
      and(
        eq(consentRecords.customerId, customerId),
        eq(consentRecords.channel, channel),
        eq(consentRecords.isActive, true)
      )
    )
    .orderBy(consentRecords.consentedAt);

  // Get the latest one
  const consent = consentRows.sort((a, b) =>
    b.consentedAt > a.consentedAt ? 1 : -1
  )[0] || null;

  if (!consent && messageType === "marketing") {
    return {
      allowed: false,
      reason: `No active ${channel.toUpperCase()} consent on file. Marketing messages require express consent.`,
      warnings,
    };
  }

  // Transactional messages need at least implied consent
  if (!consent && messageType === "transactional") {
    warnings.push("No explicit consent record — sending as transactional only.");
  }

  // 2. Check opt-out via recent inbound messages
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const recentInbound = await db
    .select()
    .from(communications)
    .where(
      and(
        eq(communications.customerId, customerId),
        eq(communications.direction, "inbound"),
        eq(communications.type, channel === "sms" ? "sms" : "email"),
        gte(communications.createdAt, cutoff)
      )
    )
    .orderBy(communications.createdAt);

  const recentInboundSorted = recentInbound.sort((a, b) =>
    b.createdAt > a.createdAt ? 1 : -1
  ).slice(0, 10);

  for (const msg of recentInboundSorted) {
    if (msg.body && detectOptOut(msg.body)) {
      return {
        allowed: false,
        reason: `Customer opted out via ${channel} on ${new Date(msg.createdAt).toLocaleDateString()}. Message: "${msg.body?.substring(0, 50)}". Consent must be re-obtained.`,
        warnings,
      };
    }
  }

  // 3. Time window check (8 AM - 9 PM CT for Texas)
  if (channel === "sms") {
    const now = new Date();
    const ct = new Date(
      now.toLocaleString("en-US", { timeZone: "America/Chicago" })
    );
    const hour = ct.getHours();

    if (hour < 8 || hour >= 21) {
      return {
        allowed: false,
        reason: `Cannot send SMS outside 8:00 AM - 9:00 PM CT. Current CT time: ${ct.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}. Message will be queued for the next valid window.`,
        warnings,
      };
    }
  }

  // 4. Frequency cap for marketing messages
  if (messageType === "marketing") {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const recentOutbound = await db
      .select()
      .from(communications)
      .where(
        and(
          eq(communications.customerId, customerId),
          eq(communications.direction, "outbound"),
          eq(communications.type, channel === "sms" ? "sms" : "email"),
          gte(communications.createdAt, weekAgo)
        )
      );

    const recentOutboundCount = recentOutbound.length;

    if (recentOutboundCount >= 3) {
      warnings.push(
        `Customer received ${recentOutboundCount} ${channel} messages this week. Consider reducing frequency.`
      );
    }

    if (recentOutboundCount >= 5) {
      return {
        allowed: false,
        reason: `Frequency cap exceeded: ${recentOutboundCount} ${channel} messages sent this week (limit: 5). Try again next week.`,
        warnings,
      };
    }
  }

  // 5. Content check for marketing — must include business name and opt-out
  if (messageType === "marketing" && channel === "sms") {
    warnings.push("Ensure message includes business name and opt-out instructions (Reply STOP to unsubscribe).");
  }

  return { allowed: true, warnings };
}

export function detectOptOut(messageText: string): boolean {
  const upper = messageText.toUpperCase().trim();
  const lower = messageText.toLowerCase().trim();

  // Exact keyword match
  for (const keyword of OPT_OUT_KEYWORDS) {
    if (upper === keyword || upper.startsWith(keyword + " ") || upper.endsWith(" " + keyword)) {
      return true;
    }
  }

  // Phrase match
  for (const phrase of OPT_OUT_PHRASES) {
    if (lower.includes(phrase)) {
      return true;
    }
  }

  return false;
}

export async function processOptOut(
  customerId: string,
  channel: "sms" | "email",
  method: string = "text_stop"
): Promise<void> {
  const db = getDb();

  // Revoke all active consent for this channel
  await db
    .update(consentRecords)
    .set({
      isActive: false,
      revokedAt: new Date().toISOString(),
      revokeMethod: method,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(consentRecords.customerId, customerId),
        eq(consentRecords.channel, channel),
        eq(consentRecords.isActive, true)
      )
    );

  // Create notification
  const [customer] = await db
    .select({ name: customers.name })
    .from(customers)
    .where(eq(customers.id, customerId));

  const allUsers = await db.select({ id: users.id }).from(users);
  if (allUsers.length > 0) {
    await db.insert(notifications).values({
      userId: allUsers[0].id,
      type: "opt_out",
      title: "Customer Opted Out",
      message: `${customer?.name || "A customer"} opted out of ${channel.toUpperCase()} messages.`,
      link: `/customers`,
    });
  }
}

export async function recordConsent(params: {
  customerId: string;
  channel: "sms" | "email" | "voice";
  consentType: "express" | "express_written" | "implied" | "transactional";
  consentSource: string;
  consentText?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  const db = getDb();
  await db.insert(consentRecords).values({
    customerId: params.customerId,
    channel: params.channel,
    consentType: params.consentType,
    consentSource: params.consentSource,
    consentText: params.consentText,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });
}

export async function getComplianceStats(): Promise<{
  activeConsent: { sms: number; email: number };
  optedOut: { sms: number; email: number };
  blockedThisMonth: number;
}> {
  const db = getDb();

  const allRecords = await db.select().from(consentRecords);

  const smsConsent = allRecords.filter((r) => r.channel === "sms" && r.isActive).length;
  const emailConsent = allRecords.filter((r) => r.channel === "email" && r.isActive).length;
  const smsOptOut = allRecords.filter((r) => r.channel === "sms" && !r.isActive && r.revokedAt !== null).length;
  const emailOptOut = allRecords.filter((r) => r.channel === "email" && !r.isActive && r.revokedAt !== null).length;

  return {
    activeConsent: { sms: smsConsent, email: emailConsent },
    optedOut: { sms: smsOptOut, email: emailOptOut },
    blockedThisMonth: 0,
  };
}
