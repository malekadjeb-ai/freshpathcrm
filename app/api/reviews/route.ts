import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { reviews, customers, jobs, businessSettings } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const reviewSchema = z.object({
  customerId: z.string().min(1),
  jobId: z.string().optional().nullable(),
  platform: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  content: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const platform = searchParams.get("platform");

    const conditions = [eq(customers.tenantId, tenantId)];
    if (status) conditions.push(eq(reviews.status, status));
    if (platform) conditions.push(eq(reviews.platform, platform));

    const rows = await db
      .select({
        review: reviews,
        customer: {
          id: customers.id,
          name: customers.name,
          phone: customers.phone,
          email: customers.email,
        },
        job: {
          id: jobs.id,
          status: jobs.status,
          scheduledAt: jobs.scheduledAt,
        },
      })
      .from(reviews)
      .leftJoin(customers, eq(reviews.customerId, customers.id))
      .leftJoin(jobs, eq(reviews.jobId, jobs.id))
      .where(and(...conditions))
      .orderBy(reviews.createdAt);

    const result = rows
      .map((r) => ({
        ...r.review,
        customer: r.customer?.id ? r.customer : null,
        job: r.job?.id ? r.job : null,
      }))
      .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

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
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    // Verify customer belongs to tenant
    const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, data.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const [settings] = await db.select().from(businessSettings).where(eq(businessSettings.tenantId, tenantId));
    const reviewUrl = settings?.googleReviewUrl || null;

    const [review] = await db
      .insert(reviews)
      .values({
        customerId: data.customerId,
        jobId: data.jobId || null,
        platform: data.platform || "google",
        reviewUrl,
        status: "pending",
      })
      .returning();

    const [customerRow] = await db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(eq(customers.id, data.customerId));

    return NextResponse.json({ ...review, customer: customerRow || null }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
