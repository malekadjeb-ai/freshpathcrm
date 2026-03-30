import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { expenses, jobs, customers } from "@/src/db/schema";
import { and, eq, gte, lte, inArray } from "drizzle-orm";
import { expenseSchema } from "@/lib/validations/expense";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const conditions = [eq(expenses.tenantId, tenantId)];
    if (category) conditions.push(eq(expenses.category, category));
    if (from) conditions.push(gte(expenses.date, from));
    if (to) conditions.push(lte(expenses.date, to + "T23:59:59.999Z"));

    const expenseRows = await db
      .select()
      .from(expenses)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(expenses.date);

    // Fetch job + customer info for expenses that have a jobId
    const jobIds = [...new Set(expenseRows.map((e) => e.jobId).filter(Boolean))] as string[];
    const jobRows = jobIds.length
      ? await db
          .select({ id: jobs.id, status: jobs.status, customerId: jobs.customerId })
          .from(jobs)
          .where(inArray(jobs.id, jobIds))
      : [];
    const customerIds = [...new Set(jobRows.map((j) => j.customerId))];
    const customerRows = customerIds.length
      ? await db
          .select({ id: customers.id, name: customers.name })
          .from(customers)
          .where(inArray(customers.id, customerIds))
      : [];

    const jobMap = Object.fromEntries(jobRows.map((j) => [j.id, j]));
    const customerMap = Object.fromEntries(customerRows.map((c) => [c.id, c]));

    const result = expenseRows.map((e) => {
      const job = e.jobId ? jobMap[e.jobId] : null;
      const customer = job ? customerMap[job.customerId] : null;
      return {
        ...e,
        job: job
          ? {
              id: job.id,
              status: job.status,
              customer: customer ? { name: customer.name } : null,
            }
          : null,
      };
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const body = await req.json();
    const parsed = expenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const expense = (
      await db
        .insert(expenses)
        .values({
          ...data,
          tenantId,
          date: new Date(data.date).toISOString(),
        })
        .returning()
    )[0];

    return NextResponse.json(expense, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
