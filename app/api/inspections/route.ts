import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { inspections, jobs, customers } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

    // Verify job belongs to tenant via customer
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    if (job) {
      const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, job.customerId), eq(customers.tenantId, tenantId))).limit(1);
      if (!custCheck) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [inspection] = await db
      .select()
      .from(inspections)
      .where(eq(inspections.jobId, jobId));

    return NextResponse.json(inspection ?? null);
  } catch (error) {
    console.error("Get inspection error:", error);
    return NextResponse.json({ error: "Failed to fetch inspection" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const body = await req.json();
    const { jobId, photos, condition, odometer, signature, signedName } = body;

    if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

    // Check if job exists and belongs to tenant
    const [jobCheck] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    if (!jobCheck) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    const [custCheckPost] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, jobCheck.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheckPost) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Check for existing inspection
    const [existing] = await db.select().from(inspections).where(eq(inspections.jobId, jobId));

    if (existing) {
      // Update existing
      const [updated] = await db
        .update(inspections)
        .set({
          photos: JSON.stringify(photos || []),
          ...(condition !== undefined && { condition }),
          ...(odometer !== undefined && odometer !== null && { odometer: parseInt(odometer) }),
          ...(signature !== undefined && { signature }),
          ...(signedName !== undefined && { signedName }),
          ...(signature ? { signedAt: new Date().toISOString() } : {}),
        })
        .where(eq(inspections.jobId, jobId))
        .returning();
      return NextResponse.json(updated);
    }

    const [inspection] = await db
      .insert(inspections)
      .values({
        jobId,
        photos: JSON.stringify(photos || []),
        condition: condition || null,
        odometer: odometer ? parseInt(odometer) : null,
        signature: signature || null,
        signedName: signedName || null,
        signedAt: signature ? new Date().toISOString() : null,
      })
      .returning();

    return NextResponse.json(inspection);
  } catch (error) {
    console.error("Create inspection error:", error);
    return NextResponse.json({ error: "Failed to create inspection" }, { status: 500 });
  }
}
