import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { eq, and, isNull } from "drizzle-orm";
import { customers, jobs } from "@/src/db/schema";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const id = params.id;

    const [customer] = await db
      .select({ id: customers.id, lastJobAt: customers.lastJobAt })
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
      .limit(1);

    if (!customer) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const customerJobs = await db
      .select({ id: jobs.id, total: jobs.total })
      .from(jobs)
      .where(and(eq(jobs.customerId, id), isNull(jobs.deletedAt)));

    const totalSpent = customerJobs.reduce((sum, j) => sum + j.total, 0);

    return NextResponse.json({
      jobCount: customerJobs.length,
      totalSpent,
      lastJobDate: customer.lastJobAt,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
