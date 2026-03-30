import { NextResponse } from "next/server";
import { getDb } from "@/src/db";
import { businessSettings } from "@/src/db/schema";

export async function GET() {
  try {
    const db = getDb();
    const settings = await db.select().from(businessSettings).limit(1).then(r => r[0]);
    if (!settings || !settings.bookingEnabled) {
      return NextResponse.json(
        { error: "Online booking is not currently available" },
        { status: 400 }
      );
    }

    const workingDays: number[] = JSON.parse(settings.workingDays || "[1,2,3,4,5,6]");

    return NextResponse.json({
      businessName: settings.businessName,
      phone: settings.phone,
      pageTitle: settings.bookingPageTitle || "Book Your Detail",
      pageDescription: settings.bookingPageDescription || null,
      workingHoursStart: settings.workingHoursStart,
      workingHoursEnd: settings.workingHoursEnd,
      workingDays,
      slotDurationMinutes: settings.slotDurationMinutes,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
