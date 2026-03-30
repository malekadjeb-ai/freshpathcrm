import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { recalculateHealthScore, recalculateAllHealthScores } from "@/lib/services/customer-health";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { tenantId } = auth;

    const { customerId } = await req.json();

    if (customerId) {
      // Verify customer belongs to tenant before recalculating
      const db = (await import("@/src/db")).getDb();
      const { eq, and } = await import("drizzle-orm");
      const { customers } = await import("@/src/db/schema");
      const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId))).limit(1);
      if (!custCheck) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

      const result = await recalculateHealthScore(customerId);
      if (!result) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      return NextResponse.json(result);
    }

    // Recalculate all (currently unscoped - recalculates all customers)
    // TODO: Pass tenantId to recalculateAllHealthScores for multi-tenant
    const results = await recalculateAllHealthScores();
    return NextResponse.json({ updated: results.length, results });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
