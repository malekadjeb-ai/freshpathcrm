import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { jobs, customers } from "@/src/db/schema";
import { and, eq, isNull, inArray } from "drizzle-orm";

const VALID_STATUSES = ["Scheduled", "In Progress", "Completed", "Cancelled"];

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { tenantId } = auth;

    const db = getDb();
    const { action, ids, data } = await req.json();
    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Verify all jobs belong to tenant's customers
    const tenantCustRows = await db.select({ id: customers.id }).from(customers).where(eq(customers.tenantId, tenantId));
    const tenantCustIds = tenantCustRows.map(c => c.id);
    const jobRows = tenantCustIds.length
      ? await db.select({ id: jobs.id }).from(jobs).where(and(inArray(jobs.id, ids), inArray(jobs.customerId, tenantCustIds), isNull(jobs.deletedAt)))
      : [];
    const validJobIds = jobRows.map(j => j.id);
    if (validJobIds.length === 0) {
      return NextResponse.json({ success: true, affected: 0 });
    }

    let affected = 0;

    switch (action) {
      case "change_status": {
        const status = data?.status as string;
        if (!status || !VALID_STATUSES.includes(status)) {
          return NextResponse.json(
            { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
            { status: 400 }
          );
        }

        const updateFields: Record<string, unknown> = {
          status,
          updatedAt: new Date().toISOString(),
        };
        if (status === "In Progress") {
          updateFields.startedAt = new Date().toISOString();
        } else if (status === "Completed") {
          updateFields.completedAt = new Date().toISOString();
        }

        const result = await db
          .update(jobs)
          .set(updateFields)
          .where(and(inArray(jobs.id, validJobIds), isNull(jobs.deletedAt)))
          .returning({ id: jobs.id });
        affected = result.length;
        break;
      }
      case "delete": {
        const result = await db
          .update(jobs)
          .set({ deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
          .where(and(inArray(jobs.id, validJobIds), isNull(jobs.deletedAt)))
          .returning({ id: jobs.id });
        affected = result.length;
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, affected });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
