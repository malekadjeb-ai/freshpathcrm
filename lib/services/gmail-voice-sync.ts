import { google, gmail_v1 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { getDbAsync } from "@/src/db";
import { customers, leads, communications } from "@/src/db/schema";
import { isNotNull, inArray, eq } from "drizzle-orm";
import { normalizePhone } from "@/lib/services/google-voice-parser";

interface ParsedGVEmail {
  type: "call" | "sms" | "voicemail";
  direction: "inbound" | "outbound" | "missed";
  phoneNumber: string | null;
  contactName: string | null;
  body: string | null;
  duration: number | null;
  timestamp: Date;
  gmailMessageId: string;
}

// ─── Subject line parsing ───────────────────────────────────────────

function parseGVEmailSubject(subject: string): Partial<ParsedGVEmail> | null {
  const normalized = subject
    .trim()
    .replace(/^(fwd|re|fw):\s*/i, "")
    .replace(/^google voice[:\-–]\s*/i, "")
    .replace(/^voice[:\-–]\s*/i, "");
  const lower = normalized.toLowerCase();

  if (lower.startsWith("missed call from") || lower.startsWith("new missed call from") || lower.includes("missed call")) {
    const name = normalized.replace(/^(new )?missed call from\s*/i, "").replace(/\.\s*$/, "").trim();
    return { type: "call", direction: "missed", contactName: name || null };
  }

  if (lower.startsWith("voicemail from") || lower.includes("new voicemail")) {
    const name = normalized.replace(/^(new )?voicemail from\s*/i, "").trim();
    return { type: "voicemail", direction: "inbound", contactName: name || null };
  }

  if (lower.startsWith("call from") || lower.startsWith("incoming call from")) {
    const name = normalized.replace(/^(incoming )?call from\s*/i, "").trim();
    return { type: "call", direction: "inbound", contactName: name || null };
  }

  if (lower.startsWith("call to") || lower.startsWith("outgoing call to")) {
    const name = normalized.replace(/^(outgoing )?call to\s*/i, "").trim();
    return { type: "call", direction: "outbound", contactName: name || null };
  }

  if (
    lower.startsWith("text message from") ||
    lower.startsWith("new text message from") ||
    lower.startsWith("new text from") ||
    lower.startsWith("sms from") ||
    lower.startsWith("text from") ||
    lower.startsWith("message from") ||
    lower.includes("sent you a text") ||
    lower.includes("sent a message")
  ) {
    const name = normalized
      .replace(/^new\s*/i, "")
      .replace(/^(text message|text|sms|message)\s*from\s*/i, "")
      .replace(/\s*sent you a text.*/i, "")
      .replace(/\s*sent a message.*/i, "")
      .replace(/\.\s*$/, "")
      .trim();
    return { type: "sms", direction: "inbound", contactName: name || null };
  }

  if (
    lower.startsWith("text message to") ||
    lower.startsWith("text to") ||
    lower.startsWith("sms to") ||
    lower.startsWith("message to")
  ) {
    const name = normalized
      .replace(/^(text message|text|sms|message)\s*to\s*/i, "")
      .trim();
    return { type: "sms", direction: "outbound", contactName: name || null };
  }

  if (lower.includes("google voice") || lower.includes("voicemail")) {
    return { type: "call", direction: "inbound", contactName: null };
  }

  return null;
}

// ─── Phone number extraction ────────────────────────────────────────

function extractPhoneFromText(text: string): string | null {
  if (!text) return null;

  const intlMatch = text.match(/\+?1?\s*[-.]?\s*\(?(\d{3})\)?\s*[-.]?\s*(\d{3})\s*[-.]?\s*(\d{4})/);
  if (intlMatch) {
    return `${intlMatch[1]}${intlMatch[2]}${intlMatch[3]}`;
  }

  const digits = text.replace(/\D/g, "");
  if (digits.length >= 10) {
    return digits.slice(-10);
  }

  return null;
}

// ─── Duration parsing ───────────────────────────────────────────────

function parseDuration(text: string): number | null {
  if (!text) return null;

  const minSec = text.match(/(\d+)\s*(?:minutes?|min)\s*(?:(\d+)\s*(?:seconds?|sec))?/i);
  if (minSec) {
    return parseInt(minSec[1]) * 60 + (parseInt(minSec[2]) || 0);
  }

  const secOnly = text.match(/(\d+)\s*(?:seconds?|sec)\b/i);
  if (secOnly) {
    return parseInt(secOnly[1]);
  }

  const timeMatch = text.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/);
  if (timeMatch) {
    if (timeMatch[3]) {
      return parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]);
    }
    return parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
  }

  const parenTime = text.match(/\((\d{1,2}):(\d{2})(?::(\d{2}))?\)/);
  if (parenTime) {
    if (parenTime[3]) {
      return parseInt(parenTime[1]) * 3600 + parseInt(parenTime[2]) * 60 + parseInt(parenTime[3]);
    }
    return parseInt(parenTime[1]) * 60 + parseInt(parenTime[2]);
  }

  return null;
}

// ─── Email body extraction ──────────────────────────────────────────

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
      return stripHtml(decodeBase64Url(htmlPart.body.data));
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

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── SMS body extraction ─────────────────────────────────────────────

function extractSMSBody(rawBody: string, subject: string): string | null {
  if (!rawBody) return null;

  const lines = rawBody
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const boilerplate = [
    "voice-noreply",
    "google voice",
    "to respond to this text",
    "to reply to this",
    "your google voice number",
    "learn more about",
    "google llc",
    "https://voice.google.com",
    "you received this",
    "this email was sent",
    "unsubscribe",
    "do not reply to this email",
    "view message",
    "open in google voice",
  ];

  const contactInfo = subject.replace(/^(new )?(text message|text|sms|message)\s*(from|to)\s*/i, "").trim();

  const meaningful = lines.filter((line) => {
    const lower = line.toLowerCase();
    if (boilerplate.some((bp) => lower.includes(bp))) return false;
    if (contactInfo && lower === contactInfo.toLowerCase()) return false;
    if (line.length < 3) return false;
    if (/^\d{1,2}:\d{2}\s*(AM|PM)?$/i.test(line)) return false;
    if (/^[\d\s\-\(\)\+]+$/.test(line) && line.replace(/\D/g, "").length >= 7) return false;
    return true;
  });

  if (meaningful.length > 0) {
    return meaningful.join("\n").substring(0, 2000);
  }

  return lines[0]?.substring(0, 500) || null;
}

// ─── Voicemail transcript extraction ────────────────────────────────

function extractVoicemailTranscript(rawBody: string): string | null {
  if (!rawBody) return null;

  const transcriptMatch = rawBody.match(/transcript[:\s]*(.+)/i);
  if (transcriptMatch) {
    return transcriptMatch[1].trim().substring(0, 2000);
  }

  const lines = rawBody
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => {
      if (!l) return false;
      const lower = l.toLowerCase();
      return (
        !lower.includes("voicemail from") &&
        !lower.includes("google voice") &&
        !lower.includes("play message") &&
        !lower.includes("voice-noreply") &&
        !lower.includes("to listen") &&
        l.length > 5
      );
    });

  return lines.length > 0 ? lines.join(" ").substring(0, 2000) : null;
}

function getHeader(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";
}

// ─── Main sync function ─────────────────────────────────────────────

export async function syncGoogleVoiceFromGmail(
  authClient: OAuth2Client,
  sinceDate: Date
): Promise<{
  imported: number;
  skipped: number;
  matched: number;
  created: number;
  errors: number;
  total: number;
}> {
  const gmail = google.gmail({ version: "v1", auth: authClient });
  const db = await getDbAsync();

  const stats = { imported: 0, skipped: 0, matched: 0, created: 0, errors: 0, total: 0 };

  const afterEpoch = Math.floor(sinceDate.getTime() / 1000);
  const query = `after:${afterEpoch} (from:voice-noreply@google.com OR from:voice-noreply@googlevoice.com OR from:voice@google.com OR from:googlevoice-noreply@google.com OR from:txt.voice.google.com)`;

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

  // Build phone→customer map
  const allCustomers = await db.select({
    id: customers.id,
    name: customers.name,
    phone: customers.phone,
  }).from(customers).where(isNotNull(customers.phone));

  const phoneMap = new Map<string, { id: string; name: string }>();
  for (const c of allCustomers) {
    if (c.phone) {
      const normalized = normalizePhone(c.phone);
      if (normalized) phoneMap.set(normalized, { id: c.id, name: c.name });
    }
  }

  // Build phone→lead map
  const existingLeads = await db.select({
    id: leads.id,
    name: leads.name,
    phone: leads.phone,
  }).from(leads).where(isNotNull(leads.phone));

  const leadPhoneMap = new Map<string, { id: string; name: string }>();
  for (const l of existingLeads) {
    if (l.phone) {
      const normalized = normalizePhone(l.phone);
      if (normalized) leadPhoneMap.set(normalized, { id: l.id, name: l.name });
    }
  }

  // Check existing external IDs to avoid duplicates
  const existingComms = await db.select({ externalId: communications.externalId })
    .from(communications)
    .where(
      inArray(communications.source, ["google_voice_gmail", "google_voice_import"])
    );
  const existingExtIds = new Set(existingComms.map((c) => c.externalId).filter(Boolean));

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
      const date = getHeader(headers, "Date");

      const parsed = parseGVEmailSubject(subject);
      if (!parsed || !parsed.type || !parsed.direction) {
        stats.skipped++;
        continue;
      }

      const recordType = parsed.type;
      const recordDirection = parsed.direction;
      const rawBody = msg.payload ? getEmailBody(msg.payload) : "";
      const timestamp = date ? new Date(date) : new Date(parseInt(msg.internalDate || "0"));

      let phone = extractPhoneFromText(parsed.contactName || "");
      if (!phone) phone = extractPhoneFromText(rawBody);
      if (!phone) {
        const fromHeader = getHeader(headers, "From");
        phone = extractPhoneFromText(fromHeader);
      }

      const duration =
        recordType === "call" || recordType === "voicemail"
          ? parseDuration(rawBody)
          : null;

      let messageBody: string | null = null;
      if (recordType === "sms") {
        messageBody = extractSMSBody(rawBody, subject);
      } else if (recordType === "voicemail") {
        messageBody = extractVoicemailTranscript(rawBody);
      }

      let customerId: string | null = null;
      let leadId: string | null = null;
      const normalizedPhone = phone ? normalizePhone(phone) : null;

      if (normalizedPhone && phoneMap.has(normalizedPhone)) {
        customerId = phoneMap.get(normalizedPhone)!.id;
        stats.matched++;
      } else if (normalizedPhone) {
        if (leadPhoneMap.has(normalizedPhone)) {
          leadId = leadPhoneMap.get(normalizedPhone)!.id;
        } else {
          const displayName =
            parsed.contactName && !extractPhoneFromText(parsed.contactName)
              ? parsed.contactName
              : formatPhone(normalizedPhone);

          const leadPriority =
            recordDirection === "missed" || recordType === "voicemail"
              ? "high"
              : "medium";

          const [newLead] = await db.insert(leads).values({
            name: displayName,
            phone: formatPhone(normalizedPhone),
            source: "Google Voice",
            status: "New",
            priority: leadPriority,
            notes: `Auto-created from ${recordType} (${recordDirection}) via Google Voice sync`,
            nextFollowUpDate: new Date().toISOString(),
            tenantId: "cmn8cvk4k000012sdo18ee9c5",
          }).returning();
          leadId = newLead.id;
          leadPhoneMap.set(normalizedPhone, { id: newLead.id, name: newLead.name });
        }
        stats.created++;
      } else {
        stats.skipped++;
        continue;
      }

      let status = "completed";
      if (recordDirection === "missed") status = "missed";
      else if (recordType === "voicemail") status = "voicemail";
      else if (recordType === "sms") status = recordDirection === "inbound" ? "received" : "sent";

      await db.insert(communications).values({
        customerId,
        leadId,
        type: recordType === "voicemail" ? "voicemail" : recordType,
        direction: recordDirection,
        status,
        summary:
          recordType === "sms" && messageBody
            ? messageBody.length > 200
              ? messageBody.substring(0, 200) + "..."
              : messageBody
            : subject,
        body: messageBody,
        duration,
        source: "google_voice_gmail",
        externalId: msgId,
        outcome: recordDirection === "missed" ? "no_answer" : undefined,
        createdAt: timestamp.toISOString(),
      });

      if (customerId) {
        await db.update(customers).set({
          lastContactedAt: timestamp.toISOString(),
          updatedAt: new Date().toISOString(),
        }).where(eq(customers.id, customerId));
      }

      if (leadId) {
        await db.update(leads).set({
          contactedAt: timestamp.toISOString(),
          updatedAt: new Date().toISOString(),
        }).where(eq(leads.id, leadId));
      }

      stats.imported++;
    } catch (err) {
      console.error(`[GV Sync] Error processing message ${msgId}:`, err);
      stats.errors++;
    }
  }

  return stats;
}

function formatPhone(digits: string): string {
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return digits;
}
