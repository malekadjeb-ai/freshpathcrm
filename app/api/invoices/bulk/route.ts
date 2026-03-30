import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { invoices, customers } from "@/src/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { tenantId } = auth;

    const db = getDb();

    // Pre-fetch tenant customer IDs for scoping
    const tenantCustRows = await db.select({ id: customers.id }).from(customers).where(eq(customers.tenantId, tenantId));
    const tenantCustIds = tenantCustRows.map(c => c.id);
    const { action, ids } = await req.json();
    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    let affected = 0;

    switch (action) {
      case "mark_sent": {
        const updated = await db
          .update(invoices)
          .set({
            status: "Sent",
            sentAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .where(
            and(
              inArray(invoices.id, ids),
              eq(invoices.status, "Draft"),
              isNull(invoices.deletedAt),
              tenantCustIds.length > 0 ? inArray(invoices.customerId, tenantCustIds) : eq(invoices.customerId, "")
            )
          )
          .returning({ id: invoices.id });
        affected = updated.length;
        break;
      }
      case "delete": {
        const updated = await db
          .update(invoices)
          .set({
            deletedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .where(
            and(
              inArray(invoices.id, ids),
              eq(invoices.status, "Draft"),
              isNull(invoices.deletedAt),
              tenantCustIds.length > 0 ? inArray(invoices.customerId, tenantCustIds) : eq(invoices.customerId, "")
            )
          )
          .returning({ id: invoices.id });
        affected = updated.length;
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
