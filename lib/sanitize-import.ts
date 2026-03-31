/**
 * Input sanitization for Google Voice import (and any future import).
 * Normalizes, validates, and cleans each record before it hits the database.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_DIGITS_RE = /\d/g;
const MAX_NAME_LENGTH = 120;
const MAX_BODY_LENGTH = 5000;

interface RawImportRecord {
  phoneNumber?: string;
  contactName?: string;
  direction?: string;
  type?: string;
  timestamp?: string;
  duration?: unknown;
  messageBody?: string;
  email?: string;
}

export interface SanitizedRecord {
  phoneNumber: string;
  contactName: string;
  direction: "inbound" | "outbound" | "missed";
  type: "call" | "text" | "voicemail";
  timestamp: string;
  duration: number | undefined;
  messageBody: string | undefined;
}

export interface SanitizeResult {
  valid: SanitizedRecord[];
  errors: { index: number; reason: string }[];
  duplicatesRemoved: number;
}

function normalizePhoneForDedup(phone: string): string {
  const digits = (phone.match(PHONE_DIGITS_RE) || []).join("");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

function sanitizeName(raw: string | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/[\x00-\x1f]/g, "") // strip control chars
    .trim()
    .slice(0, MAX_NAME_LENGTH);
}

function sanitizeBody(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return raw
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "") // strip non-printable except \n \r \t
    .trim()
    .slice(0, MAX_BODY_LENGTH) || undefined;
}

const VALID_DIRECTIONS = new Set(["inbound", "outbound", "missed"]);
const VALID_TYPES = new Set(["call", "text", "voicemail"]);

export function validateEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

export function sanitizeImportRecords(
  raw: RawImportRecord[]
): SanitizeResult {
  const valid: SanitizedRecord[] = [];
  const errors: { index: number; reason: string }[] = [];
  const seen = new Set<string>();
  let duplicatesRemoved = 0;

  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];

    // Phone is required
    if (!r.phoneNumber) {
      errors.push({ index: i, reason: "Missing phone number" });
      continue;
    }

    const normalizedPhone = normalizePhoneForDedup(r.phoneNumber);
    if (normalizedPhone.length < 7 || normalizedPhone.length > 15) {
      errors.push({ index: i, reason: `Invalid phone number: ${r.phoneNumber}` });
      continue;
    }

    // Timestamp must be parseable
    if (!r.timestamp) {
      errors.push({ index: i, reason: "Missing timestamp" });
      continue;
    }
    const ts = new Date(r.timestamp);
    if (isNaN(ts.getTime())) {
      errors.push({ index: i, reason: `Invalid timestamp: ${r.timestamp}` });
      continue;
    }

    // Direction and type must be valid
    const direction = r.direction?.toLowerCase() || "inbound";
    if (!VALID_DIRECTIONS.has(direction)) {
      errors.push({ index: i, reason: `Invalid direction: ${r.direction}` });
      continue;
    }

    const type = r.type?.toLowerCase() || "call";
    if (!VALID_TYPES.has(type)) {
      errors.push({ index: i, reason: `Invalid type: ${r.type}` });
      continue;
    }

    // Duplicate detection within the import batch itself
    const dedupKey = `${normalizedPhone}_${ts.toISOString()}_${type}_${direction}`;
    if (seen.has(dedupKey)) {
      duplicatesRemoved++;
      continue;
    }
    seen.add(dedupKey);

    // Duration must be a non-negative number
    let duration: number | undefined;
    if (r.duration !== undefined && r.duration !== null) {
      const d = Number(r.duration);
      duration = isNaN(d) || d < 0 ? undefined : Math.round(d);
    }

    valid.push({
      phoneNumber: r.phoneNumber.trim(),
      contactName: sanitizeName(r.contactName),
      direction: direction as SanitizedRecord["direction"],
      type: type as SanitizedRecord["type"],
      timestamp: ts.toISOString(),
      duration,
      messageBody: sanitizeBody(r.messageBody),
    });
  }

  return { valid, errors, duplicatesRemoved };
}
