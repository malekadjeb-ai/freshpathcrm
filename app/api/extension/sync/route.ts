import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { customers, communications, tasks } from "@/src/db/schema";
import { eq, and, gte, lte, isNotNull } from "drizzle-orm";
import { normalizePhone } from "@/lib/services/google-voice-parser";

interface ExtensionRecord {
  phoneNumber: string;
  contactName?: string;
  type: "call" | "text" | "voicemail";
  direction: "inbound" | "outbound" | "missed";
  timestamp: string;
  duration?: number | null;
  messageBody?: string | null;
  source?: string;
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

  try {
    const body = await req.json();
    const records: ExtensionRecord[] = body.records;

    if (!records || records.length === 0) {
      return NextResponse.json({ error: "No records" }, { status: 400 });
    }

    const db = getDb();

    // Build phone → customer lookup
    const allCustomers = await db.select({ id: customers.id, name: customers.name, phone: customers.phone })
      .from(customers)
      .where(and(isNotNull(customers.phone), eq(customers.tenantId, tenantId)));

    const phoneMap = new Map<string, { id: string; name: string }>();
    for (const c of allCustomers) {
      if (c.phone) {
        phoneMap.set(normalizePhone(c.phone), { id: c.id, name: c.name });
      }
    }

    let imported = 0;
    let skipped = 0;
    let matched = 0;
    let tasksCreated = 0;

    for (const record of records) {
      const normalized = normalizePhone(record.phoneNumber || "");
      const ts = new Date(record.timestamp);

      if (isNaN(ts.getTime())) {
        skipped++;
        continue;
      }

      // Duplicate check: same timestamp + type + direction within 1 minute
      const existing = await db.select({ id: communications.id }).from(communications).where(
        and(
          eq(communications.source, "chrome_extension"),
          eq(communications.type, record.type),
          eq(communications.direction, record.direction),
          gte(communications.createdAt, new Date(ts.getTime() - 60000).toISOString()),
          lte(communications.createdAt, new Date(ts.getTime() + 60000).toISOString())
        )
      ).limit(1).then(r => r[0]);

      if (existing) {
        skipped++;
        continue;
      }

      const customer = normalized ? phoneMap.get(normalized) : null;
      let customerId: string | null = customer?.id || null;

      if (!customerId && normalized) {
        const displayPhone =
          normalized.length === 10
            ? `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`
            : record.phoneNumber;

        const [newCustomer] = await db.insert(customers).values({
          name: record.contactName || displayPhone,
          phone: displayPhone,
          source: "Google Voice Extension",
          tenantId,
        }).returning();
        customerId = newCustomer.id;
        phoneMap.set(normalized, { id: newCustomer.id, name: newCustomer.name });
      }

      if (!customerId) {
        skipped++;
        continue;
      }

      matched++;

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
        source: "chrome_extension",
        createdAt: ts.toISOString(),
      });

      await db.update(customers).set({
        lastContactedAt: ts.toISOString(),
        updatedAt: new Date().toISOString(),
      }).where(eq(customers.id, customerId));

      if (record.direction === "missed") {
        const customerName = customer?.name || record.contactName || record.phoneNumber;
        const dueAt = new Date(ts.getTime() + 30 * 60 * 1000);

        await db.insert(tasks).values({
          title: `Call back ${customerName}`,
          description: `Missed call detected by Google Voice extension at ${ts.toLocaleString()}`,
          priority: "High",
          completed: false,
          dueDate: dueAt.toISOString(),
          customerId,
        });
        tasksCreated++;
      }

      imported++;
    }

    return NextResponse.json({
      imported,
      skipped,
      matched,
      tasksCreated,
      total: records.length,
    });
  } catch (error) {
    console.error("Extension sync error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
