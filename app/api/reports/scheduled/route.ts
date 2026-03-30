import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { scheduledReports } from "@/src/db/schema";
import { desc } from "drizzle-orm";

// GET: List all scheduled reports
export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const reports = await db.select().from(scheduledReports).orderBy(desc(scheduledReports.createdAt));
    return NextResponse.json(reports);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Create a scheduled report
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const { name, type, frequency } = await req.json();
    if (!name || !type || !frequency) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const db = getDb();
    const [report] = await db.insert(scheduledReports).values({ name, type, frequency }).returning();
    return NextResponse.json(report);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
