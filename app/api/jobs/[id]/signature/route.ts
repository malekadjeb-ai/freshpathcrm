import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { jobs, customers } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();

    // Verify job's customer belongs to tenant
    const [jobRow] = await db.select({ customerId: jobs.customerId }).from(jobs).where(eq(jobs.id, params.id)).limit(1);
    if (!jobRow) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, jobRow.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const body = await req.json();
    const { signature } = body;

    if (!signature || typeof signature !== "string") {
      return NextResponse.json({ error: "Signature data is required" }, { status: 400 });
    }

    // Validate it's a data URL
    if (!signature.startsWith("data:image/")) {
      return NextResponse.json({ error: "Invalid signature format" }, { status: 400 });
    }

    const [job] = await db
      .update(jobs)
      .set({ customerSignature: signature, updatedAt: new Date().toISOString() })
      .where(eq(jobs.id, params.id))
      .returning({ id: jobs.id, customerSignature: jobs.customerSignature });

    return NextResponse.json(job);
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

    // Verify job's customer belongs to tenant
    const [jobDel] = await db.select({ customerId: jobs.customerId }).from(jobs).where(eq(jobs.id, params.id)).limit(1);
    if (!jobDel) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    const [custDel] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, jobDel.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custDel) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    await db
      .update(jobs)
      .set({ customerSignature: null, updatedAt: new Date().toISOString() })
      .where(eq(jobs.id, params.id));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
