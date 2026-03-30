import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { leads } from "@/src/db/schema";
import { eq, and, inArray } from "drizzle-orm";

const VALID_STATUSES = ["New", "Contacted", "Qualified", "Quoted", "Won", "Lost"];
const VALID_PRIORITIES = ["low", "medium", "high", "urgent"];

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { tenantId } = auth;

    const { action, ids, data } = await req.json();
    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const db = getDb();
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
        const result = await db
          .update(leads)
          .set({ status, updatedAt: new Date().toISOString() })
          .where(and(inArray(leads.id, ids), eq(leads.tenantId, tenantId)))
          .returning({ id: leads.id });
        affected = result.length;
        break;
      }
      case "change_priority": {
        const priority = data?.priority as string;
        if (!priority || !VALID_PRIORITIES.includes(priority)) {
          return NextResponse.json(
            { error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}` },
            { status: 400 }
          );
        }
        const result = await db
          .update(leads)
          .set({ priority, updatedAt: new Date().toISOString() })
          .where(and(inArray(leads.id, ids), eq(leads.tenantId, tenantId)))
          .returning({ id: leads.id });
        affected = result.length;
        break;
      }
      case "delete": {
        const result = await db
          .delete(leads)
          .where(and(inArray(leads.id, ids), eq(leads.tenantId, tenantId)))
          .returning({ id: leads.id });
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
