import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getDb } from "@/src/db";
import { jobs, customers } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

  try {
    const db = getDb();
    // Verify job's customer belongs to tenant
    const [jobCheck] = await db.select({ customerId: jobs.customerId }).from(jobs).where(eq(jobs.id, params.id)).limit(1);
    if (!jobCheck) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, jobCheck.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    const formData = await request.formData();
    const files = formData.getAll("photos") as File[];
    const type = (formData.get("type") as string) || "after";

    if (!files.length) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "jobs",
      params.id
    );
    await mkdir(uploadDir, { recursive: true });

    const uploadedPaths: string[] = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 10 * 1024 * 1024) continue;

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const fileName = `${type}_${timestamp}_${safeName}`;
      const filePath = path.join(uploadDir, fileName);

      await writeFile(filePath, buffer);
      uploadedPaths.push(`/uploads/jobs/${params.id}/${fileName}`);
    }

    const [job] = await db
      .select({ photos: jobs.photos })
      .from(jobs)
      .where(eq(jobs.id, params.id));

    const existingPhotos = job?.photos ? JSON.parse(job.photos as string) : [];
    const updatedPhotos = [
      ...existingPhotos,
      ...uploadedPaths.map((p) => ({
        url: p,
        type,
        uploadedAt: new Date().toISOString(),
      })),
    ];

    await db
      .update(jobs)
      .set({ photos: JSON.stringify(updatedPhotos), updatedAt: new Date().toISOString() })
      .where(eq(jobs.id, params.id));

    return NextResponse.json({ photos: updatedPhotos });
  } catch (error) {
    console.error("Photo upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

  try {
    const db = getDb();

    // Verify job's customer belongs to tenant
    const [jobDel] = await db.select({ customerId: jobs.customerId }).from(jobs).where(eq(jobs.id, params.id)).limit(1);
    if (!jobDel) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    const [custDel] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, jobDel.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custDel) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const { photoUrl } = await request.json();

    const [job] = await db
      .select({ photos: jobs.photos })
      .from(jobs)
      .where(eq(jobs.id, params.id));

    const existingPhotos = job?.photos ? JSON.parse(job.photos as string) : [];
    const updatedPhotos = existingPhotos.filter(
      (p: { url: string }) => p.url !== photoUrl
    );

    await db
      .update(jobs)
      .set({ photos: JSON.stringify(updatedPhotos), updatedAt: new Date().toISOString() })
      .where(eq(jobs.id, params.id));

    return NextResponse.json({ photos: updatedPhotos });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
