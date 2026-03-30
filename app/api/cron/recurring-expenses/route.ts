import { NextResponse } from "next/server";
import { getDbAsync } from "@/src/db";
import { expenses } from "@/src/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

/**
 * GET /api/cron/recurring-expenses
 * Duplicates all recurring expenses for the current month if they haven't been created yet.
 * Should be called once daily via Vercel Cron or external scheduler.
 */
export async function GET() {
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

    // Get all recurring expenses
    const recurringExpenses = await db
      .select()
      .from(expenses)
      .where(eq(expenses.isRecurring, true));

    let created = 0;
    let skipped = 0;

    for (const recurring of recurringExpenses) {
      // Check if this recurring expense already has an entry this month
      const existing = await db
        .select({ id: expenses.id })
        .from(expenses)
        .where(
          and(
            eq(expenses.category, recurring.category),
            eq(expenses.description, recurring.description),
            eq(expenses.amount, recurring.amount),
            gte(expenses.date, monthStart),
            lte(expenses.date, monthEnd),
            eq(expenses.isRecurring, false)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      // Create this month's entry (non-recurring copy)
      await db.insert(expenses).values({
        category: recurring.category,
        description: recurring.description,
        amount: recurring.amount,
        date: today,
        vendor: recurring.vendor,
        jobId: null,
        isRecurring: false,
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
      { status: 500 }
    );
  }
}
