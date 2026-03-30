import JSZip from "jszip";

export interface GVRecord {
  phoneNumber: string;
  contactName?: string;
  direction: "inbound" | "outbound" | "missed";
  type: "call" | "text" | "voicemail";
  timestamp: Date;
  duration?: number;
  messageBody?: string;
  rawFilename: string;
}

/**
 * Parse a Google Takeout Voice export ZIP into structured records.
 */
export async function parseGoogleVoiceZip(
  zipBuffer: ArrayBuffer
): Promise<GVRecord[]> {
  const zip = await JSZip.loadAsync(zipBuffer);
  const records: GVRecord[] = [];

  // Find all HTML files in the Calls directory
  const callFiles: string[] = [];
  zip.forEach((relativePath, file) => {
    if (
      !file.dir &&
      relativePath.endsWith(".html") &&
      (relativePath.includes("Voice/Calls/") ||
        relativePath.includes("Voice\\Calls\\"))
    ) {
      callFiles.push(relativePath);
    }
  });

  for (const filePath of callFiles) {
    const file = zip.file(filePath);
    if (!file) continue;

    const filename = filePath.split("/").pop() || filePath.split("\\").pop() || "";
    const meta = parseFilename(filename);
    if (!meta.timestamp) continue;

    const html = await file.async("string");
    const content = parseHTMLContent(html, meta.type || "call");

    records.push({
      phoneNumber: meta.phoneNumber || "",
      contactName: meta.contactName,
      direction: meta.direction || "inbound",
      type: meta.type || "call",
      timestamp: meta.timestamp,
      duration: content.duration,
      messageBody: content.messageBody,
      rawFilename: filename,
    });
  }

  // Sort by timestamp ascending
  records.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  return records;
}

function parseFilename(filename: string): Partial<GVRecord> {
  // Pattern: "CONTACT - TYPE - TIMESTAMP.html"
  const match = filename.match(
    /^(.+?) - (Received|Placed|Missed|Text|Voicemail) - (.+?)\.html$/
  );
  if (!match) return {};

  const [, contact, typeStr, timestampStr] = match;

  const direction: GVRecord["direction"] =
    typeStr === "Placed"
      ? "outbound"
      : typeStr === "Missed"
        ? "missed"
        : "inbound";

  const type: GVRecord["type"] =
    typeStr === "Text"
      ? "text"
      : typeStr === "Voicemail"
        ? "voicemail"
        : "call";

  // Timestamp format: 2026-03-25T14_30_00Z → 2026-03-25T14:30:00Z
  const timestamp = new Date(timestampStr.replace(/_/g, ":"));

  // Contact might be a phone number (+15551234567) or a name
  const trimmed = contact.trim();
  const isPhone = /^\+?\d[\d\s()-]+$/.test(trimmed);

  return {
    phoneNumber: isPhone ? trimmed.replace(/[\s()-]/g, "") : "",
    contactName: !isPhone ? trimmed : undefined,
    direction,
    type,
    timestamp: isNaN(timestamp.getTime()) ? undefined : timestamp,
    rawFilename: "",
  };
}

function parseHTMLContent(
  html: string,
  type: string
): { duration?: number; messageBody?: string } {
  const result: { duration?: number; messageBody?: string } = {};

  if (type === "call" || type === "voicemail") {
    // Look for duration patterns: "(00:05:23)" or "(5:23)"
    const durationMatch = html.match(/\((\d{1,2}):(\d{2}):(\d{2})\)/);
    if (durationMatch) {
      const [, hours, minutes, seconds] = durationMatch;
      result.duration =
        parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
    } else {
      const shortMatch = html.match(/\((\d{1,2}):(\d{2})\)/);
      if (shortMatch) {
        const [, minutes, seconds] = shortMatch;
        result.duration = parseInt(minutes) * 60 + parseInt(seconds);
      }
    }
  }

  if (type === "text" || type === "voicemail") {
    // GV exports wrap messages in <q> tags inside message_row divs
    const bodyMatch = html.match(
      /<div[^>]*class="[^"]*message_row[^"]*"[\s\S]*?<q>([\s\S]*?)<\/q>/
    );
    if (bodyMatch) {
      result.messageBody = bodyMatch[1].replace(/<[^>]+>/g, "").trim();
    }
    // Alternative: any <q> tag
    if (!result.messageBody) {
      const altMatch = html.match(/<q>([\s\S]*?)<\/q>/);
      if (altMatch) {
        result.messageBody = altMatch[1].replace(/<[^>]+>/g, "").trim();
      }
    }
    // Fallback: look for message class divs
    if (!result.messageBody) {
      const divMatch = html.match(
        /<div[^>]*class="[^"]*message[^"]*"[^>]*>([\s\S]*?)<\/div>/
      );
      if (divMatch) {
        const text = divMatch[1].replace(/<[^>]+>/g, "").trim();
        if (text.length > 0 && text.length < 5000) {
          result.messageBody = text;
        }
      }
    }
  }

  return result;
}

/**
 * Normalize a phone number to last 10 digits for matching.
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/**
 * Summary stats for preview.
 */
export function getRecordStats(records: GVRecord[]) {
  const calls = records.filter((r) => r.type === "call").length;
  const texts = records.filter((r) => r.type === "text").length;
  const voicemails = records.filter((r) => r.type === "voicemail").length;
  const phones = new Set(records.map((r) => normalizePhone(r.phoneNumber)).filter(Boolean));
  const names = new Set(records.filter((r) => r.contactName).map((r) => r.contactName));

  return {
    total: records.length,
    calls,
    texts,
    voicemails,
    uniqueContacts: phones.size + names.size,
    dateRange:
      records.length > 0
        ? {
            start: records[0].timestamp,
            end: records[records.length - 1].timestamp,
          }
        : null,
  };
}
