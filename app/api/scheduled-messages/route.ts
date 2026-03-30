import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { scheduledMessages, customers, jobs, messageTemplates } from "@/src/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const jobId = searchParams.get("jobId");

    const conditions = [];
    if (status) conditions.push(eq(scheduledMessages.status, status));
    if (jobId) conditions.push(eq(scheduledMessages.jobId, jobId));

    const msgs = await db
      .select()
      .from(scheduledMessages)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(scheduledMessages.scheduledAt))
      .limit(100);

    // Batch: fetch all related customers, jobs, and templates
    const msgCustIds = [...new Set(msgs.filter(m => m.customerId).map(m => m.customerId!))];
    const msgJobIds = [...new Set(msgs.filter(m => m.jobId).map(m => m.jobId!))];
    const msgTemplateIds = [...new Set(msgs.filter(m => m.templateId).map(m => m.templateId!))];

    const [msgCustBatch, msgJobBatch, msgTemplateBatch] = await Promise.all([
      msgCustIds.length ? db.select({ id: customers.id, name: customers.name, phone: customers.phone, email: customers.email }).from(customers).where(inArray(customers.id, msgCustIds)) : Promise.resolve([]),
      msgJobIds.length ? db.select({ id: jobs.id, status: jobs.status, scheduledAt: jobs.scheduledAt }).from(jobs).where(inArray(jobs.id, msgJobIds)) : Promise.resolve([]),
      msgTemplateIds.length ? db.select({ id: messageTemplates.id, name: messageTemplates.name }).from(messageTemplates).where(inArray(messageTemplates.id, msgTemplateIds)) : Promise.resolve([]),
    ]);

    const msgCustMap = new Map(msgCustBatch.map(c => [c.id, c]));
    const msgJobMap = new Map(msgJobBatch.map(j => [j.id, j]));
    const msgTemplateMap = new Map(msgTemplateBatch.map(t => [t.id, t]));

    const enriched = msgs.map((msg) => ({
      ...msg,
      customer: msg.customerId ? msgCustMap.get(msg.customerId) ?? null : null,
      job: msg.jobId ? msgJobMap.get(msg.jobId) ?? null : null,
      template: msg.templateId ? msgTemplateMap.get(msg.templateId) ?? null : null,
    }));

    return NextResponse.json(enriched);
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
    const { customerId, jobId, channel, to, subject, body, scheduledAt, templateId } = await req.json();

    if (!customerId || !channel || !to || !body || !scheduledAt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [message] = await db.insert(scheduledMessages).values({
      customerId,
      jobId: jobId || null,
      templateId: templateId || null,
      channel,
      to,
      subject: subject || null,
      body,
      scheduledAt: new Date(scheduledAt).toISOString(),
      status: "pending",
    }).returning();

    const [customer] = await db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(eq(customers.id, customerId));

    return NextResponse.json({ ...message, customer }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
