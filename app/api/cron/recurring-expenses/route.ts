import { NextRequest, NextResponse } from "next/server";
import { getDbAsync } from "@/src/db";
import { expenses } from "@/src/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { verifyCronRequest } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = verifyCronRequest(req);
  if (denied) return denied;
  try {
    const db = await getDbAsync();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];
    const today = now.toISOString().split("T")[0];

    const recurringExpenses = await db
      .select()
      .from(expenses)
      .where(eq(expenses.isRecurring, true));

    let created = 0;
    let skipped = 0;

    for (const recurring of recurringExpenses) {
      // A copy is identified by same (tenant, category, description, amount)
      // landing in the current month and not flagged as recurring itself.
      const dupChecks = [
        eq(expenses.category, recurring.category),
        eq(expenses.description, recurring.description),
        eq(expenses.amount, recurring.amount),
        gte(expenses.date, monthStart),
        lte(expenses.date, monthEnd),
        eq(expenses.isRecurring, false),
        recurring.tenantId ? eq(expenses.tenantId, recurring.tenantId) : undefined,
      ].filter(Boolean);

      const existing = await db
        .select({ id: expenses.id })
        .from(expenses)
        .where(and(...dupChecks))
        .limit(1);

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      await db.insert(expenses).values({
        category: recurring.category,
        description: recurring.description,
        amount: recurring.amount,
        date: today,
        vendor: recurring.vendor,
        jobId: null,
        isRecurring: false,
        tenantId: recurring.tenantId,
      });
      created++;
    }

    return NextResponse.json({
      recurring: recurringExpenses.length,
      created,
      skipped,
    });
  } catch (err) {
    console.error("[CRON] Recurring expenses error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
