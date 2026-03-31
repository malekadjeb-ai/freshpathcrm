import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/src/db";
import { jobs, vehicles, jobServices, serviceItems } from "@/src/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : null;
    const limit = Math.min(parseInt(searchParams.get("limit") || "25"), 100);
    const galleryJobs = await db.select({
      id: jobs.id,
      photos: jobs.photos,
      completedAt: jobs.completedAt,
      vehicleId: jobs.vehicleId,
    }).from(jobs).where(
      and(
        eq(jobs.showInGallery, true),
        isNull(jobs.deletedAt),
        inArray(jobs.status, ["Completed", "Invoiced", "Paid"])
      )
    ).orderBy().limit(50);

    // Batch: fetch all vehicles and services for gallery jobs
    const galleryVehicleIds = [...new Set(galleryJobs.filter(j => j.vehicleId).map(j => j.vehicleId!))];
    const galleryJobIds = galleryJobs.map(j => j.id);

    const [galleryVehBatch, gallerySvcBatch] = await Promise.all([
      galleryVehicleIds.length
        ? db.select({ id: vehicles.id, make: vehicles.make, model: vehicles.model, year: vehicles.year, vehicleType: vehicles.vehicleType, color: vehicles.color })
            .from(vehicles).where(inArray(vehicles.id, galleryVehicleIds))
        : Promise.resolve([]),
      galleryJobIds.length
        ? db.select({ jobId: jobServices.jobId, serviceItem: serviceItems }).from(jobServices).leftJoin(serviceItems, eq(jobServices.serviceItemId, serviceItems.id)).where(inArray(jobServices.jobId, galleryJobIds))
        : Promise.resolve([]),
    ]);

    const galleryVehMap = new Map(galleryVehBatch.map(v => [v.id, v]));
    const gallerySvcMap = new Map<string, (typeof gallerySvcBatch)[number][]>();
    for (const s of gallerySvcBatch) {
      if (!gallerySvcMap.has(s.jobId)) gallerySvcMap.set(s.jobId, []);
      gallerySvcMap.get(s.jobId)!.push(s);
    }

    const gallery = galleryJobs.map((job) => {
      const vehicle = job.vehicleId ? galleryVehMap.get(job.vehicleId) ?? null : null;
      const svcs = gallerySvcMap.get(job.id) || [];

      const photos = JSON.parse(job.photos || "[]") as {
        url: string;
        type: "before" | "after";
        uploadedAt: string;
      }[];
      const before = photos.filter((p) => p.type === "before");
      const after = photos.filter((p) => p.type === "after");

      if (before.length === 0 && after.length === 0) return null;

      return {
        id: job.id,
        vehicle: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : null,
        vehicleType: vehicle?.vehicleType ?? null,
        vehicleColor: vehicle?.color ?? null,
        services: svcs.map((s) => s.serviceItem?.name || ""),
        completedAt: job.completedAt,
        before,
        after,
      };
    });

    const filtered = gallery.filter(Boolean);

    if (page) {
      const total = filtered.length;
      const paginatedResult = filtered.slice((page - 1) * limit, page * limit);
      return NextResponse.json({
        data: paginatedResult,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }
    return NextResponse.json(filtered);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
