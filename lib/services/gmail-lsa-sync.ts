import { google, gmail_v1 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { getDbAsync } from "@/src/db";
import { leads } from "@/src/db/schema";
import { isNotNull, inArray } from "drizzle-orm";

/**
 * Syncs Google Local Service Ads (LSA) lead notification emails from Gmail.
 */

interface LSALeadInfo {
  name: string | null;
  phone: string | null;
  email: string | null;
  serviceType: string | null;
  location: string | null;
  jobType: string | null;
  message: string | null;
  timestamp: Date;
  gmailMessageId: string;
}

// ─── Email body parsing ──────────────────────────────────────────────

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

function getEmailBody(payload: gmail_v1.Schema$MessagePart): string {
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts) {
    const textPart = payload.parts.find((p) => p.mimeType === "text/plain");
    if (textPart?.body?.data) return decodeBase64Url(textPart.body.data);
    const htmlPart = payload.parts.find((p) => p.mimeType === "text/html");
    if (htmlPart?.body?.data) {
      return decodeBase64Url(htmlPart.body.data);
    }
    for (const part of payload.parts) {
      if (part.parts) {
        const nested = getEmailBody(part);
        if (nested) return nested;
      }
    }
  }
  return "";
}

function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string
): string {
  return (
    headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())
      ?.value || ""
  );
}

// ─── LSA email content parsing ───────────────────────────────────────

function extractPhoneFromText(text: string): string | null {
  if (!text) return null;
  const match = text.match(
    /\+?1?\s*[-.]?\s*\(?(\d{3})\)?\s*[-.]?\s*(\d{3})\s*[-.]?\s*(\d{4})/
  );
  if (match) return `${match[1]}${match[2]}${match[3]}`;
  const digits = text.replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return null;
}

function formatPhone(digits: string): string {
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return digits;
}

function parseLSAEmailBody(body: string, htmlBody: string): Partial<LSALeadInfo> {
  const info: Partial<LSALeadInfo> = {};

  const text = body.length > htmlBody.length ? body : htmlBody;

  const cleaned = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  const lines = cleaned.split(/\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const nameMatch = line.match(
      /(?:customer\s*name|name|from|contact)\s*[:\-–]\s*(.+)/i
    );
    if (nameMatch) {
      const candidate = nameMatch[1].trim().replace(/\s+/g, " ");
      if (candidate.length >= 2 && candidate.length <= 50 && /[a-zA-Z]/.test(candidate)) {
        info.name = candidate;
        break;
      }
    }
  }

  for (const line of lines) {
    const phoneLineMatch = line.match(
      /(?:phone|call|number|tel)\s*[:\-–]\s*(.+)/i
    );
    if (phoneLineMatch) {
      const phone = extractPhoneFromText(phoneLineMatch[1]);
      if (phone) {
        info.phone = phone;
        break;
      }
    }
  }
  if (!info.phone) {
    info.phone = extractPhoneFromText(cleaned);
  }

  const emailMatch = cleaned.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (emailMatch) {
    const candidate = emailMatch[0].toLowerCase();
    if (
      !candidate.includes("google.com") &&
      !candidate.includes("noreply") &&
      !candidate.includes("no-reply")
    ) {
      info.email = candidate;
    }
  }

  for (const line of lines) {
    const serviceMatch = line.match(
      /(?:service|job\s*type|category|service\s*type|requested\s*service)\s*[:\-–]\s*(.+)/i
    );
    if (serviceMatch) {
      info.serviceType = serviceMatch[1].trim().substring(0, 100);
      break;
    }
  }

  for (const line of lines) {
    const locMatch = line.match(
      /(?:location|zip\s*code|zip|city|area|address)\s*[:\-–]\s*(.+)/i
    );
    if (locMatch) {
      info.location = locMatch[1].trim().substring(0, 200);
      break;
    }
  }

  for (const line of lines) {
    const msgMatch = line.match(
      /(?:message|note|details|description|customer\s*message|request)\s*[:\-–]\s*(.+)/i
    );
    if (msgMatch) {
      info.message = msgMatch[1].trim().substring(0, 500);
      break;
    }
  }

  if (!info.name && !info.phone && !info.serviceType) {
    const summary = cleaned.substring(0, 500);
    if (summary.length > 10) {
      info.message = summary;
    }
  }

  return info;
}

// ─── Main LSA sync function ──────────────────────────────────────────

export async function syncLSALeadsFromGmail(
  authClient: OAuth2Client,
  sinceDate: Date
): Promise<{
  imported: number;
  skipped: number;
  errors: number;
  total: number;
}> {
  const gmail = google.gmail({ version: "v1", auth: authClient });
  const db = await getDbAsync();
  const stats = { imported: 0, skipped: 0, errors: 0, total: 0 };

  const afterEpoch = Math.floor(sinceDate.getTime() / 1000);
  const query = `after:${afterEpoch} (from:local-services-noreply@google.com OR from:lsa-noreply@google.com) (subject:"new lead" OR subject:"new message" OR subject:"booking" OR subject:"Local Services")`;

  let pageToken: string | undefined;
  const allMessageIds: string[] = [];

  do {
    const listRes = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 100,
      pageToken,
    });
    const messages = listRes.data.messages || [];
    allMessageIds.push(...messages.map((m) => m.id!).filter(Boolean));
    pageToken = listRes.data.nextPageToken || undefined;
  } while (pageToken);

  stats.total = allMessageIds.length;
  if (allMessageIds.length === 0) return stats;

  // Check which messages we've already processed
  const existingLeadsRows = await db.select({
    sourceDetail: leads.sourceDetail,
  }).from(leads).where(
    inArray(leads.sourceDetail, allMessageIds)
  );
  const existingExtIds = new Set(
    existingLeadsRows.map((l) => l.sourceDetail).filter(Boolean)
  );

  // Also check existing leads by phone
  const allLeads = await db.select({ phone: leads.phone }).from(leads).where(isNotNull(leads.phone));
  const existingPhones = new Set<string>();
  for (const l of allLeads) {
    if (l.phone) {
      const digits = l.phone.replace(/\D/g, "").slice(-10);
      if (digits.length === 10) existingPhones.add(digits);
    }
  }

  for (const msgId of allMessageIds) {
    if (existingExtIds.has(msgId)) {
      stats.skipped++;
      continue;
    }

    try {
      const msgRes = await gmail.users.messages.get({
        userId: "me",
        id: msgId,
        format: "full",
      });

      const msg = msgRes.data;
      const headers = msg.payload?.headers;
      const subject = getHeader(headers, "Subject");
      const dateHeader = getHeader(headers, "Date");
      const timestamp = dateHeader
        ? new Date(dateHeader)
        : new Date(parseInt(msg.internalDate || "0"));

      const plainBody = msg.payload ? getEmailBody(msg.payload) : "";
      let htmlBody = "";
      if (msg.payload?.parts) {
        const htmlPart = msg.payload.parts.find(
          (p) => p.mimeType === "text/html"
        );
        if (htmlPart?.body?.data) {
          htmlBody = decodeBase64Url(htmlPart.body.data);
        }
      }

      const parsed = parseLSAEmailBody(plainBody, htmlBody);

      if (parsed.phone && existingPhones.has(parsed.phone)) {
        stats.skipped++;
        continue;
      }

      const leadName =
        parsed.name || (parsed.phone ? formatPhone(parsed.phone) : `LSA Lead (${timestamp.toLocaleDateString()})`);

      const noteParts: string[] = [];
      noteParts.push(`Source: Google Local Service Ads`);
      noteParts.push(`Email subject: ${subject}`);
      if (parsed.serviceType) noteParts.push(`Service requested: ${parsed.serviceType}`);
      if (parsed.location) noteParts.push(`Location: ${parsed.location}`);
      if (parsed.message) noteParts.push(`Customer message: ${parsed.message}`);
      noteParts.push(`Received: ${timestamp.toLocaleString()}`);

      await db.insert(leads).values({
        name: leadName,
        phone: parsed.phone ? formatPhone(parsed.phone) : null,
        email: parsed.email || null,
        source: "Google LSA",
        sourceDetail: msgId,
        status: "New",
        priority: "high",
        notes: noteParts.join("\n"),
        vehicleInfo: parsed.serviceType || null,
        address: parsed.location || null,
        nextFollowUpDate: new Date().toISOString(),
        tenantId: "cmn8cvk4k000012sdo18ee9c5",
      });

      if (parsed.phone) existingPhones.add(parsed.phone);

      stats.imported++;
    } catch (err) {
      console.error(`[LSA Sync] Error processing message ${msgId}:`, err);
      stats.errors++;
    }
  }

  return stats;
}
