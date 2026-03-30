import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { vehicles, customers, jobs, jobServices, serviceItems } from "@/src/db/schema";
import { and, eq, inArray, isNull, desc } from "drizzle-orm";
import { differenceInDays } from "date-fns";

interface TimelineEntry {
  id: string;
  date: string;
  type: "maintenance" | "correction" | "protection" | "detail";
  services: string[];
  productsUsed: string[];
  notes: string | null;
  photos: string[];
  total: number;
  technician: string | null;
}

interface ProtectionStatus {
  ceramicCoating: { applied: string | null; expiresApprox: string | null; monthsRemaining: number | null } | null;
  lastWash: { date: string; daysAgo: number } | null;
  lastInterior: { date: string; daysAgo: number } | null;
  lastPaintCorrection: { date: string; grade: string | null } | null;
}

interface RecommendedService {
  service: string;
  reason: string;
  urgency: "low" | "medium" | "high";
  daysSinceLast: number | null;
}

function categorizeService(name: string): TimelineEntry["type"] {
  const lower = name.toLowerCase();
  if (lower.includes("ceramic") || lower.includes("sealant") || lower.includes("ppf") || lower.includes("protection")) return "protection";
  if (lower.includes("correction") || lower.includes("polish") || lower.includes("compound")) return "correction";
  if (lower.includes("wash") || lower.includes("wax") || lower.includes("maintenance")) return "maintenance";
  return "detail";
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();

    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, params.id)).limit(1);
    if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });

    // Verify vehicle belongs to tenant via customer
    if (vehicle.customerId) {
      const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, vehicle.customerId), eq(customers.tenantId, tenantId))).limit(1);
      if (!custCheck) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [customer] = vehicle.customerId
      ? await db.select({ name: customers.name }).from(customers).where(eq(customers.id, vehicle.customerId)).limit(1)
      : [null];

    const vehicleJobs = await db.select().from(jobs).where(
      and(
        eq(jobs.vehicleId, params.id),
        isNull(jobs.deletedAt),
        inArray(jobs.status, ["Completed", "Invoiced", "Paid"])
      )
    ).orderBy(desc(jobs.completedAt));

    // Batch: fetch all services for all vehicle jobs
    const vehJobIds = vehicleJobs.map(j => j.id);
    const allVehJobSvcs = vehJobIds.length
      ? await db.select({ jobId: jobServices.jobId, serviceItem: serviceItems }).from(jobServices)
          .leftJoin(serviceItems, eq(jobServices.serviceItemId, serviceItems.id))
          .where(inArray(jobServices.jobId, vehJobIds))
      : [];
    const vehJobSvcMap = new Map<string, (typeof allVehJobSvcs)[number][]>();
    for (const s of allVehJobSvcs) {
      if (!vehJobSvcMap.has(s.jobId)) vehJobSvcMap.set(s.jobId, []);
      vehJobSvcMap.get(s.jobId)!.push(s);
    }

    const jobsWithServices = vehicleJobs.map((job) => ({
      job,
      svcs: vehJobSvcMap.get(job.id) || [],
    }));

    const now = new Date();

    // Build timeline
    const timeline: TimelineEntry[] = jobsWithServices.map(({ job, svcs }) => {
      const serviceNames = svcs.map((s) => s.serviceItem?.name || "").filter(Boolean);
      const categories = serviceNames.map(categorizeService);
      const primaryType = categories.includes("protection")
        ? "protection"
        : categories.includes("correction")
        ? "correction"
        : categories.includes("maintenance")
        ? "maintenance"
        : "detail";

      let photos: string[] = [];
      try {
        photos = JSON.parse(job.photos || "[]");
      } catch { /* empty */ }

      return {
        id: job.id,
        date: job.completedAt || job.scheduledAt || job.createdAt,
        type: primaryType,
        services: serviceNames,
        productsUsed: [],
        notes: job.notes,
        photos,
        total: job.total,
        technician: job.assignedToId,
      };
    });

    // Build protection status
    const protectionStatus: ProtectionStatus = {
      ceramicCoating: null,
      lastWash: null,
      lastInterior: null,
      lastPaintCorrection: null,
    };

    for (const entry of timeline) {
      const serviceJoined = entry.services.join(" ").toLowerCase();

      if (!protectionStatus.ceramicCoating && serviceJoined.includes("ceramic")) {
        const applied = new Date(entry.date);
        const expiresApprox = new Date(applied);
        expiresApprox.setFullYear(expiresApprox.getFullYear() + 2);
        protectionStatus.ceramicCoating = {
          applied: entry.date,
          expiresApprox: expiresApprox.toISOString(),
          monthsRemaining: Math.max(0, Math.round(differenceInDays(expiresApprox, now) / 30)),
        };
      }

      if (!protectionStatus.lastWash && (serviceJoined.includes("wash") || serviceJoined.includes("exterior"))) {
        protectionStatus.lastWash = {
          date: entry.date,
          daysAgo: differenceInDays(now, new Date(entry.date)),
        };
      }

      if (!protectionStatus.lastInterior && serviceJoined.includes("interior")) {
        protectionStatus.lastInterior = {
          date: entry.date,
          daysAgo: differenceInDays(now, new Date(entry.date)),
        };
      }

      if (!protectionStatus.lastPaintCorrection && serviceJoined.includes("correction")) {
        protectionStatus.lastPaintCorrection = {
          date: entry.date,
          grade: serviceJoined.includes("2-stage") || serviceJoined.includes("two") ? "2-stage" : "1-stage",
        };
      }
    }

    // Build recommendations
    const recommendations: RecommendedService[] = [];

    if (protectionStatus.lastWash) {
      if (protectionStatus.lastWash.daysAgo > 30) {
        recommendations.push({
          service: protectionStatus.ceramicCoating ? "Ceramic Maintenance Wash" : "Exterior Detail",
          reason: `Last wash was ${protectionStatus.lastWash.daysAgo} days ago`,
          urgency: protectionStatus.lastWash.daysAgo > 45 ? "high" : "medium",
          daysSinceLast: protectionStatus.lastWash.daysAgo,
        });
      }
    } else if (timeline.length > 0) {
      recommendations.push({
        service: "Exterior Detail",
        reason: "No wash history on record",
        urgency: "medium",
        daysSinceLast: null,
      });
    }

    if (protectionStatus.lastInterior) {
      if (protectionStatus.lastInterior.daysAgo > 60) {
        recommendations.push({
          service: "Interior Detail",
          reason: `Last interior was ${protectionStatus.lastInterior.daysAgo} days ago`,
          urgency: protectionStatus.lastInterior.daysAgo > 90 ? "high" : "medium",
          daysSinceLast: protectionStatus.lastInterior.daysAgo,
        });
      }
    }

    if (protectionStatus.ceramicCoating && protectionStatus.ceramicCoating.monthsRemaining !== null) {
      if (protectionStatus.ceramicCoating.monthsRemaining <= 3) {
        recommendations.push({
          service: "Ceramic Coating Reapplication",
          reason: `Coating expires in ~${protectionStatus.ceramicCoating.monthsRemaining} months`,
          urgency: protectionStatus.ceramicCoating.monthsRemaining <= 1 ? "high" : "medium",
          daysSinceLast: null,
        });
      }
    }

    return NextResponse.json({
      vehicle: {
        id: vehicle.id,
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        color: vehicle.color,
        customerName: customer?.name ?? null,
      },
      timeline,
      protectionStatus,
      recommendations,
    });
  } catch (error) {
    console.error("Vehicle timeline error:", error);
    return NextResponse.json({ error: "Failed to fetch timeline" }, { status: 500 });
  }
}
