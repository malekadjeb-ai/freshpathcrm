import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { communications, customers, jobs } from "@/src/db/schema";
import { eq, and, isNull } from "drizzle-orm";

/**
 * POST /api/calls
 * Logs a call and returns a Google Voice deep link for click-to-call.
 * No Twilio needed — calls happen through Google Voice, then auto-sync pulls the record.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { tenantId } = auth;

    const db = getDb();
    const { customerId, to, jobId } = await req.json();

    if (!customerId || !to) {
      return NextResponse.json(
        { error: "customerId and to are required" },
        { status: 400 }
      );
    }

    // Verify customer belongs to tenant
    const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    // Format phone for Google Voice deep link
    const phoneDigits = to.replace(/\D/g, "");
    const formattedDigits = phoneDigits.length === 10 ? `1${phoneDigits}` : phoneDigits;
    const googleVoiceUrl = `https://voice.google.com/u/0/calls?a=nc,%2B${formattedDigits}`;

    // Log the call as a communication record
    const [comm] = await db
      .insert(communications)
      .values({
        customerId,
        type: "call",
        direction: "outbound",
        status: "initiated",
        summary: `Outbound call to ${to}`,
        channel: "google_voice",
        source: "manual",
        jobId: jobId || null,
      })
      .returning();

    await db
      .update(customers)
      .set({ lastContactedAt: new Date().toISOString() })
      .where(eq(customers.id, customerId));

    return NextResponse.json({
      success: true,
      mode: "google_voice",
      googleVoiceUrl,
      communicationId: comm.id,
    });
  } catch (error) {
    console.error("Call initiation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/calls
 * Returns call history with filters.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { tenantId } = auth;

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const direction = searchParams.get("direction") || "";
    const outcome = searchParams.get("outcome") || "";
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : null;
    const limit = Math.min(parseInt(searchParams.get("limit") || "25"), 100);

    const rows = await db
      .select({
        comm: communications,
        customer: { id: customers.id, name: customers.name, phone: customers.phone },
        job: { id: jobs.id, status: jobs.status, scheduledAt: jobs.scheduledAt },
      })
      .from(communications)
      .leftJoin(customers, eq(communications.customerId, customers.id))
      .leftJoin(jobs, eq(communications.jobId, jobs.id))
      .where(
        and(
          eq(communications.type, "call"),
          isNull(communications.deletedAt),
          eq(customers.tenantId, tenantId)
        )
      )
      .orderBy(communications.createdAt);

    let results = rows.map((r) => ({
      ...r.comm,
      customer: r.customer?.id ? r.customer : null,
      job: r.job?.id ? r.job : null,
    }));

    if (direction) results = results.filter((r) => r.direction === direction);
    if (outcome) results = results.filter((r) => r.outcome === outcome);
    if (search) {
      const s = search.toLowerCase();
      results = results.filter((r) =>
        (r.customer as { name?: string } | null)?.name?.toLowerCase().includes(s)
      );
    }

    results.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

    if (page) {
      const total = results.length;
      const paginatedResult = results.slice((page - 1) * limit, page * limit);
      return NextResponse.json({
        data: paginatedResult,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }
    return NextResponse.json(results.slice(0, 100));
  } catch (error) {
    console.error("Calls error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
