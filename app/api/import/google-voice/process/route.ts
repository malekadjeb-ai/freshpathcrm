import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { customers, communications } from "@/src/db/schema";
import { eq, isNotNull } from "drizzle-orm";
import { normalizePhone } from "@/lib/services/google-voice-parser";

interface ImportRecord {
  phoneNumber: string;
  contactName?: string;
  direction: "inbound" | "outbound" | "missed";
  type: "call" | "text" | "voicemail";
  timestamp: string;
  duration?: number;
  messageBody?: string;
}

interface ImportOptions {
  records: ImportRecord[];
  matchCustomers: boolean;
  createNewCustomers: boolean;
  skipDuplicates: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    const body: ImportOptions = await req.json();
    const { records, matchCustomers, createNewCustomers, skipDuplicates } = body;

    if (!records || records.length === 0) {
      return NextResponse.json({ error: "No records to import" }, { status: 400 });
    }

    const db = getDb();

    // Build phone → customer lookup
    const phoneMap = new Map<string, string>();
    if (matchCustomers) {
      const allCustomers = await db.select({ id: customers.id, phone: customers.phone })
        .from(customers)
        .where(isNotNull(customers.phone));
      for (const c of allCustomers) {
        if (c.phone) {
          phoneMap.set(normalizePhone(c.phone), c.id);
        }
      }
    }

    // Get existing communication timestamps for duplicate detection
    const existingTimestamps = new Set<string>();
    if (skipDuplicates) {
      const existing = await db.select({
        createdAt: communications.createdAt,
        type: communications.type,
        direction: communications.direction,
      }).from(communications).where(eq(communications.source, "google_voice_import"));
      for (const e of existing) {
        existingTimestamps.add(`${e.createdAt}_${e.type}_${e.direction}`);
      }
    }

    let imported = 0;
    let skipped = 0;
    let matched = 0;
    let customersCreated = 0;

    for (const record of records) {
      const ts = new Date(record.timestamp);

      if (skipDuplicates) {
        const key = `${ts.toISOString()}_${record.type}_${record.direction}`;
        if (existingTimestamps.has(key)) {
          skipped++;
          continue;
        }
      }

      let customerId: string | null = null;
      const normalizedPhone = record.phoneNumber ? normalizePhone(record.phoneNumber) : "";

      if (normalizedPhone && matchCustomers) {
        customerId = phoneMap.get(normalizedPhone) || null;

        if (!customerId && createNewCustomers) {
          const displayPhone = normalizedPhone.length === 10
            ? `(${normalizedPhone.slice(0, 3)}) ${normalizedPhone.slice(3, 6)}-${normalizedPhone.slice(6)}`
            : record.phoneNumber;

          const [newCustomer] = await db.insert(customers).values({
            name: record.contactName || displayPhone,
            phone: displayPhone,
            source: "Google Voice Import",
          }).returning();
          customerId = newCustomer.id;
          phoneMap.set(normalizedPhone, customerId!);
          customersCreated++;
        }
      }

      if (customerId) {
        matched++;
      }

      if (!customerId) {
        skipped++;
        continue;
      }

      let summary: string;
      if (record.type === "text") {
        summary = record.messageBody
          ? record.messageBody.length > 200
            ? record.messageBody.substring(0, 200) + "..."
            : record.messageBody
          : "Text message";
      } else if (record.type === "voicemail") {
        summary = record.messageBody
          ? `Voicemail: ${record.messageBody.substring(0, 200)}`
          : "Voicemail";
      } else {
        const durStr = record.duration
          ? `, ${Math.floor(record.duration / 60)}:${String(record.duration % 60).padStart(2, "0")}`
          : "";
        summary = `${record.direction === "outbound" ? "Outbound" : record.direction === "missed" ? "Missed" : "Inbound"} call${durStr}`;
      }

      const status =
        record.direction === "missed"
          ? "missed"
          : record.type === "voicemail"
            ? "voicemail"
            : "completed";

      const outcome =
        record.direction === "missed"
          ? "no_answer"
          : record.type === "voicemail"
            ? "voicemail"
            : "completed";

      await db.insert(communications).values({
        customerId,
        type: record.type,
        channel: record.type === "text" ? "sms" : "call",
        direction: record.direction,
        status,
        summary,
        body: record.messageBody || null,
        duration: record.duration || null,
        outcome,
        source: "google_voice_import",
        createdAt: ts.toISOString(),
      });

      await db.update(customers).set({
        lastContactedAt: ts.toISOString(),
        updatedAt: new Date().toISOString(),
      }).where(eq(customers.id, customerId));

      imported++;
    }

    return NextResponse.json({
      imported,
      skipped,
      matched,
      customersCreated,
      total: records.length,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
