import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { leads, customers } from "@/src/db/schema";
import { eq, and, or, desc, count, like } from "drizzle-orm";
import { leadSchema } from "@/lib/validations/lead";
import { fireWebhooks } from "@/lib/webhooks";
import { triggerWorkflows } from "@/lib/services/workflow-engine";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const search = searchParams.get("search");

    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : null;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 500);

    // Build conditions
    const conditions = [eq(leads.tenantId, tenantId)];
    if (status) conditions.push(eq(leads.status, status));
    if (source) conditions.push(eq(leads.source, source));
    if (search) {
      conditions.push(
        or(
          like(leads.name, `%${search}%`),
          like(leads.phone, `%${search}%`),
          like(leads.email, `%${search}%`)
        )!
      );
    }

    const where = and(...conditions);

    // Fetch leads with customer join
    const query = db
      .select({
        id: leads.id,
        name: leads.name,
        phone: leads.phone,
        email: leads.email,
        source: leads.source,
        sourceDetail: leads.sourceDetail,
        status: leads.status,
        lostReason: leads.lostReason,
        lostNotes: leads.lostNotes,
        notes: leads.notes,
        vehicleInfo: leads.vehicleInfo,
        address: leads.address,
        city: leads.city,
        customerId: leads.customerId,
        estimateId: leads.estimateId,
        assignedTo: leads.assignedTo,
        priority: leads.priority,
        estimatedValue: leads.estimatedValue,
        responseTime: leads.responseTime,
        followUpCount: leads.followUpCount,
        nextFollowUpDate: leads.nextFollowUpDate,
        tenantId: leads.tenantId,
        createdAt: leads.createdAt,
        updatedAt: leads.updatedAt,
        contactedAt: leads.contactedAt,
        convertedAt: leads.convertedAt,
        lostAt: leads.lostAt,
        customer: {
          id: customers.id,
          name: customers.name,
        },
      })
      .from(leads)
      .leftJoin(customers, eq(leads.customerId, customers.id))
      .where(where)
      .orderBy(desc(leads.createdAt));

    const [totalResult, allLeads] = await Promise.all([
      db.select({ count: count() }).from(leads).where(where),
      page
        ? (query as typeof query & { limit: (n: number) => typeof query; offset: (n: number) => typeof query })
            .limit(limit)
            .offset((page - 1) * limit)
        : query,
    ]);

    const total = totalResult[0].count;

    if (page) {
      return NextResponse.json({
        data: allLeads,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }
    return NextResponse.json(allLeads);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const body = await req.json();
    const parsed = leadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const db = getDb();
    const [lead] = await db
      .insert(leads)
      .values({
        ...parsed.data,
        tenantId,
      })
      .returning();

    const leadData = {
      id: lead.id,
      leadId: lead.id,
      name: lead.name,
      customerName: lead.name,
      source: lead.source,
      phone: lead.phone,
      email: lead.email,
    };
    fireWebhooks("lead.created", leadData);
    triggerWorkflows("lead.created", leadData);

    return NextResponse.json(lead, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
