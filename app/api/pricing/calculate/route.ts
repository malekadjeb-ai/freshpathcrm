import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { calculatePrice } from "@/lib/services/pricing";
import { getDb } from "@/src/db";
import { jobs, businessSettings } from "@/src/db/schema";
import { and, gte, lte, ne, isNull } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    const body = await req.json();
    const { basePrice, scheduledDate, vehicleType, scheduledTime } = body;

    if (!basePrice || !scheduledDate) {
      return NextResponse.json({ error: "basePrice and scheduledDate required" }, { status: 400 });
    }

    const dayStart = new Date(scheduledDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(scheduledDate);
    dayEnd.setHours(23, 59, 59, 999);

    const db = getDb();
    const bookingRows = await db.select({ id: jobs.id }).from(jobs).where(
      and(
        gte(jobs.scheduledAt, dayStart.toISOString()),
        lte(jobs.scheduledAt, dayEnd.toISOString()),
        ne(jobs.status, "Cancelled"),
        isNull(jobs.deletedAt)
      )
    );
    const bookingsOnDay = bookingRows.length;

    const settings = await db.select({ maxJobsPerDay: businessSettings.maxJobsPerDay }).from(businessSettings).limit(1).then(r => r[0]);
    const maxPerDay = settings?.maxJobsPerDay || 8;

    const result = await calculatePrice(
      parseFloat(basePrice),
      new Date(scheduledDate),
      vehicleType,
      bookingsOnDay,
      maxPerDay,
      scheduledTime
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Price calc error:", error);
    return NextResponse.json({ error: "Failed to calculate price" }, { status: 500 });
  }
}
