import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/src/db";
import { businessSettings, jobs } from "@/src/db/schema";
import { and, gte, lte, ne, isNull } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const settings = await db.select().from(businessSettings).limit(1).then(r => r[0]);
    if (!settings || !settings.bookingEnabled) {
      return NextResponse.json(
        { error: "Online booking is not currently available" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");

    if (!dateStr) {
      return NextResponse.json({ error: "date parameter required" }, { status: 400 });
    }

    const date = new Date(dateStr + "T00:00:00");
    const dayOfWeek = date.getDay();
    const workingDays: number[] = JSON.parse(settings.workingDays || "[1,2,3,4,5,6]");

    if (!workingDays.includes(dayOfWeek)) {
      return NextResponse.json({ slots: [], closed: true });
    }

    const [startH, startM] = settings.workingHoursStart.split(":").map(Number);
    const [endH, endM] = settings.workingHoursEnd.split(":").map(Number);
    const slotDuration = settings.slotDurationMinutes;
    const buffer = settings.bufferMinutes;

    const dayStart = dateStr + "T00:00:00";
    const dayEnd = dateStr + "T23:59:59";

    const existingJobs = await db.select({
      scheduledAt: jobs.scheduledAt,
      estimatedDuration: jobs.estimatedDuration,
    }).from(jobs).where(
      and(
        gte(jobs.scheduledAt, dayStart),
        lte(jobs.scheduledAt, dayEnd),
        ne(jobs.status, "Cancelled")
      )
    );

    if (existingJobs.length >= settings.maxJobsPerDay) {
      return NextResponse.json({ slots: [], full: true });
    }

    const slots: string[] = [];
    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    while (currentMinutes + slotDuration <= endMinutes) {
      const slotStart = new Date(date);
      slotStart.setHours(Math.floor(currentMinutes / 60), currentMinutes % 60, 0, 0);

      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

      const hasConflict = existingJobs.some((job) => {
        if (!job.scheduledAt) return false;
        const jobStart = new Date(job.scheduledAt);
        const jobDuration = job.estimatedDuration || slotDuration;
        const jobEnd = new Date(jobStart);
        jobEnd.setMinutes(jobEnd.getMinutes() + jobDuration + buffer);

        return slotStart < jobEnd && slotEnd > jobStart;
      });

      const now = new Date();
      const isPast = slotStart <= now;

      if (!hasConflict && !isPast) {
        const hours = Math.floor(currentMinutes / 60);
        const mins = currentMinutes % 60;
        slots.push(
          `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
        );
      }

      currentMinutes += slotDuration + buffer;
    }

    return NextResponse.json({ slots });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
