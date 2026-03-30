import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { staff, jobs } from "@/src/db/schema";
import { eq, and, isNull, asc, inArray } from "drizzle-orm";
import { z } from "zod";

const staffSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  role: z.string().optional(),
  color: z.string().optional(),
  hireDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const active = searchParams.get("active");

    const conditions = [eq(staff.tenantId, tenantId)];
    if (active !== null) conditions.push(eq(staff.isActive, active === "true"));

    const staffRows = await db
      .select()
      .from(staff)
      .where(and(...conditions))
      .orderBy(asc(staff.name));

    // Batch: fetch all assigned jobs for all staff members
    const staffIds = staffRows.map(s => s.id);
    const allStaffJobs = staffIds.length
      ? await db.select({ assignedToId: jobs.assignedToId, status: jobs.status }).from(jobs).where(and(inArray(jobs.assignedToId, staffIds), isNull(jobs.deletedAt)))
      : [];

    const staffJobMap = new Map<string, { status: string }[]>();
    for (const j of allStaffJobs) {
      if (!j.assignedToId) continue;
      if (!staffJobMap.has(j.assignedToId)) staffJobMap.set(j.assignedToId, []);
      staffJobMap.get(j.assignedToId)!.push({ status: j.status });
    }

    const activeStatuses = ["Scheduled", "Confirmed", "EnRoute", "InProgress"];
    const completedStatuses = ["Completed", "Paid"];

    const staffWithStats = staffRows.map((s) => {
      const assignedJobs = staffJobMap.get(s.id) || [];
      return {
        ...s,
        totalJobs: assignedJobs.length,
        activeJobs: assignedJobs.filter((j) => activeStatuses.includes(j.status)).length,
        completedJobs: assignedJobs.filter((j) => completedStatuses.includes(j.status)).length,
      };
    });

    return NextResponse.json(staffWithStats);
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
    const parsed = staffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const [newStaff] = await db
      .insert(staff)
      .values({
        tenantId,
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        role: data.role || "technician",
        color: data.color || "#10b981",
        hireDate: data.hireDate ? new Date(data.hireDate).toISOString() : null,
        notes: data.notes || null,
      })
      .returning();

    return NextResponse.json(newStaff, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
