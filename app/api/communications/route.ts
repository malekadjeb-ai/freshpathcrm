import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { communications, customers, jobs } from "@/src/db/schema";
import { eq, and, isNull, gte, lte } from "drizzle-orm";
import { communicationSchema } from "@/lib/validations/communication";
import { recalculateHealthScore } from "@/lib/services/customer-health";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "";
    const direction = searchParams.get("direction") || "";
    const customerId = searchParams.get("customerId") || "";
    const status = searchParams.get("status") || "";
    const outcome = searchParams.get("outcome") || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    const conditions = [isNull(communications.deletedAt), eq(customers.tenantId, tenantId)];
    if (type) conditions.push(eq(communications.type, type));
    if (direction) conditions.push(eq(communications.direction, direction));
    if (customerId) conditions.push(eq(communications.customerId, customerId));
    if (status) conditions.push(eq(communications.status, status));
    if (outcome) conditions.push(eq(communications.outcome, outcome));
    if (from) conditions.push(gte(communications.createdAt, new Date(from).toISOString()));
    if (to) conditions.push(lte(communications.createdAt, new Date(to + "T23:59:59.999Z").toISOString()));

    const rows = await db
      .select({
        comm: communications,
        customer: {
          id: customers.id,
          name: customers.name,
          phone: customers.phone,
          email: customers.email,
        },
        job: {
          id: jobs.id,
          status: jobs.status,
          scheduledAt: jobs.scheduledAt,
        },
      })
      .from(communications)
      .leftJoin(customers, eq(communications.customerId, customers.id))
      .leftJoin(jobs, eq(communications.jobId, jobs.id))
      .where(and(...conditions))
      .orderBy(communications.createdAt);

    // Apply search filter in-memory (searching customer name or comm summary)
    let results = rows.map((r) => ({
      ...r.comm,
      customer: r.customer?.id ? r.customer : null,
      job: r.job?.id ? r.job : null,
    }));

    if (search) {
      const s = search.toLowerCase();
      results = results.filter(
        (r) =>
          r.summary?.toLowerCase().includes(s) ||
          (r.customer as { name?: string } | null)?.name?.toLowerCase().includes(s)
      );
    }

    // Sort descending by createdAt
    results.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

    return NextResponse.json(results);
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
    const data = communicationSchema.parse(body);

    // Verify customer belongs to tenant
    const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, data.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const [communication] = await db
      .insert(communications)
      .values({
        customerId: data.customerId,
        type: data.type,
        direction: data.direction,
        status: data.status,
        summary: data.summary || null,
        body: data.body || null,
        duration: data.duration ?? null,
        outcome: data.outcome || null,
        channel: data.channel || null,
        source: data.source || "manual",
        jobId: data.jobId || null,
        createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
      })
      .returning();

    // Fetch joined data
    const [customerRow] = await db
      .select({ id: customers.id, name: customers.name, phone: customers.phone, email: customers.email })
      .from(customers)
      .where(eq(customers.id, data.customerId));

    let jobRow = null;
    if (data.jobId) {
      const [j] = await db
        .select({ id: jobs.id, status: jobs.status, scheduledAt: jobs.scheduledAt })
        .from(jobs)
        .where(eq(jobs.id, data.jobId));
      jobRow = j || null;
    }

    // Update lastContactedAt and recalculate health score
    try {
      await db
        .update(customers)
        .set({ lastContactedAt: new Date().toISOString() })
        .where(eq(customers.id, data.customerId));
      await recalculateHealthScore(data.customerId);
    } catch {}

    return NextResponse.json(
      { ...communication, customer: customerRow || null, job: jobRow },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
