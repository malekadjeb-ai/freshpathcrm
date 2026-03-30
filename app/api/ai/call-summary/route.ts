import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateCallSummary } from "@/lib/services/auto-capture";
import { getDb } from "@/src/db";
import { customers, tasks } from "@/src/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const body = await req.json();
    const { notes, customerId, createTasks } = body;

    if (!notes || typeof notes !== "string") {
      return NextResponse.json({ error: "notes is required" }, { status: 400 });
    }

    let customerName: string | undefined;
    if (customerId) {
      const db = getDb();
      const [customer] = await db.select({ name: customers.name }).from(customers).where(eq(customers.id, customerId)).limit(1);
      customerName = customer?.name;
    }

    const result = await generateCallSummary(notes, customerName);

    // Auto-create tasks from action items if requested
    if (createTasks && result.actionItems.length > 0 && customerId) {
      const db = getDb();
      const createdTasks = await Promise.all(
        result.actionItems.map((item: string) =>
          db.insert(tasks).values({
            title: item,
            customerId,
            type: "follow_up",
            priority: "medium",
            isAutomated: true,
          }).returning().then(r => r[0])
        )
      );
      return NextResponse.json({ ...result, tasksCreated: createdTasks.length });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Call summary error:", error);
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}
