import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { campaigns, campaignRecipients, customers, customerTags } from "@/src/db/schema";
import { eq, and, isNull, isNotNull } from "drizzle-orm";
import { updateCampaignSchema } from "@/lib/validations/campaign";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, params.id));
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const recipients = await db
      .select()
      .from(campaignRecipients)
      .where(eq(campaignRecipients.campaignId, params.id))
      .orderBy(campaignRecipients.createdAt);

    recipients.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

    return NextResponse.json({ ...campaign, recipients });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const body = await req.json();
    const parsed = updateCampaignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    // Recalculate audience if criteria changed
    let audienceCount: number | undefined;
    if (data.targetCriteria) {
      const criteria = JSON.parse(data.targetCriteria);
      audienceCount = await countAudience(criteria, tenantId);
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.subject !== undefined) updateData.subject = data.subject;
    if (data.body !== undefined) updateData.body = data.body;
    if (data.targetCriteria !== undefined) updateData.targetCriteria = data.targetCriteria;
    if (audienceCount !== undefined) updateData.audienceCount = audienceCount;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.scheduledAt !== undefined) {
      updateData.scheduledAt = data.scheduledAt ? new Date(data.scheduledAt).toISOString() : null;
    }

    await db.update(campaigns).set(updateData).where(eq(campaigns.id, params.id));

    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, params.id));

    return NextResponse.json(campaign);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    // Delete recipients first, then campaign
    await db.delete(campaignRecipients).where(eq(campaignRecipients.campaignId, params.id));
    await db.delete(campaigns).where(eq(campaigns.id, params.id));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function countAudience(criteria: Record<string, string | string[]>, tenantId: string) {
  const db = getDb();

  const allCustomers = await db.select().from(customers).where(and(isNull(customers.deletedAt), eq(customers.tenantId, tenantId)));

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
