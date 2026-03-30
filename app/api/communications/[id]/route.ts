import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { communications, customers, jobs } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";
import { communicationSchema } from "@/lib/validations/communication";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const [row] = await db
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
      .where(eq(communications.id, params.id));

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Verify communication's customer belongs to tenant
    if (row.comm.customerId) {
      const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, row.comm.customerId), eq(customers.tenantId, tenantId))).limit(1);
      if (!custCheck) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...row.comm,
      customer: row.customer?.id ? row.customer : null,
      job: row.job?.id ? row.job : null,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();

    // Verify communication belongs to tenant
    const [existingComm] = await db.select().from(communications).where(eq(communications.id, params.id));
    if (!existingComm) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existingComm.customerId) {
      const [custCheckPatch] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, existingComm.customerId), eq(customers.tenantId, tenantId))).limit(1);
      if (!custCheckPatch) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const data = communicationSchema.partial().parse(body);

    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (data.customerId !== undefined) updateData.customerId = data.customerId;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.direction !== undefined) updateData.direction = data.direction;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.summary !== undefined) updateData.summary = data.summary || null;
    if (data.duration !== undefined) updateData.duration = data.duration ?? null;
    if (data.jobId !== undefined) updateData.jobId = data.jobId || null;
    if (data.createdAt !== undefined) {
      updateData.createdAt = data.createdAt ? new Date(data.createdAt).toISOString() : undefined;
    }

    await db
      .update(communications)
      .set(updateData)
      .where(eq(communications.id, params.id));

    const [row] = await db
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
      .where(eq(communications.id, params.id));

    return NextResponse.json({
      ...row.comm,
      customer: row.customer?.id ? row.customer : null,
      job: row.job?.id ? row.job : null,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();

    // Verify communication belongs to tenant
    const [existingDel] = await db.select().from(communications).where(eq(communications.id, params.id));
    if (!existingDel) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existingDel.customerId) {
      const [custCheckDel] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, existingDel.customerId), eq(customers.tenantId, tenantId))).limit(1);
      if (!custCheckDel) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db
      .update(communications)
      .set({ deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .where(eq(communications.id, params.id));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
