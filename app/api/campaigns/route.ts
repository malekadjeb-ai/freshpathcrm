import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { campaigns, customers, customerTags } from "@/src/db/schema";
import { eq, isNull, and, isNotNull } from "drizzle-orm";
import { campaignSchema } from "@/lib/validations/campaign";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let rows = await db
      .select()
      .from(campaigns)
      .orderBy(campaigns.createdAt);

    if (status) {
      rows = rows.filter((c) => c.status === status);
    }

    rows.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const body = await req.json();
    const parsed = campaignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    // Build audience count from target criteria
    const criteria = JSON.parse(data.targetCriteria || "{}");
    const audienceCount = await countAudience(criteria);

    const [campaign] = await db
      .insert(campaigns)
      .values({
        name: data.name,
        description: data.description,
        type: data.type,
        subject: data.subject,
        body: data.body,
        targetCriteria: data.targetCriteria,
        audienceCount,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt).toISOString() : null,
      })
      .returning();

    return NextResponse.json(campaign, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function countAudience(criteria: Record<string, string | string[]>) {
  const db = getDb();

  let rows = await db
    .select({ id: customers.id, email: customers.email, phone: customers.phone })
    .from(customers)
    .where(isNull(customers.deletedAt));

  if (criteria.lifecycleStage) {
    rows = rows.filter((c) => (c as Record<string, unknown>).lifecycleStage === criteria.lifecycleStage);
  }

  // Re-query with proper filters for correctness
  const allCustomers = await db.select().from(customers).where(isNull(customers.deletedAt));

  let filtered = allCustomers;
  if (criteria.lifecycleStage) {
    filtered = filtered.filter((c) => c.lifecycleStage === criteria.lifecycleStage);
  }
  if (criteria.city) {
    filtered = filtered.filter((c) => c.city === criteria.city);
  }
  if (criteria.source) {
    filtered = filtered.filter((c) => c.source === criteria.source);
  }
  if (criteria.hasEmail === "true") {
    filtered = filtered.filter((c) => c.email !== null);
  }
  if (criteria.hasPhone === "true") {
    filtered = filtered.filter((c) => c.phone !== null);
  }

  // Tags filter: keep customers that have any of the specified tags
  if (criteria.tags && Array.isArray(criteria.tags) && criteria.tags.length > 0) {
    const taggedRows = await db
      .select({ customerId: customerTags.customerId })
      .from(customerTags)
      .where(isNotNull(customerTags.customerId));
    const taggedIds = new Set(taggedRows.map((r) => r.customerId));
    filtered = filtered.filter((c) => taggedIds.has(c.id));
  }

  return filtered.length;
}
