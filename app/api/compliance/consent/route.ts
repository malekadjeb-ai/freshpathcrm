import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { consentRecords, customers } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";
import { recordConsent } from "@/lib/services/compliance";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");

    const rows = await db
      .select({
        record: consentRecords,
        customer: {
          name: customers.name,
          phone: customers.phone,
          email: customers.email,
        },
      })
      .from(consentRecords)
      .leftJoin(customers, and(eq(consentRecords.customerId, customers.id), eq(customers.tenantId, tenantId)))
      .orderBy(consentRecords.createdAt);

    let results = rows.map((r) => ({
      ...r.record,
      customer: r.customer?.name ? r.customer : null,
    }));

    if (customerId) {
      results = results.filter((r) => r.customerId === customerId);
    }

    results.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

    return NextResponse.json(results.slice(0, 100));
  } catch (error) {
    console.error("Consent list error:", error);
    return NextResponse.json({ error: "Failed to fetch consent records" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const body = await req.json();
    const { customerId, channel, consentType, consentSource, consentText } = body;

    if (!customerId || !channel || !consentType || !consentSource) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await recordConsent({
      customerId,
      channel,
      consentType,
      consentSource,
      consentText,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Record consent error:", error);
    return NextResponse.json({ error: "Failed to record consent" }, { status: 500 });
  }
}
