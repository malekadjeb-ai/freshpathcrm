import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { jobs, customers, vehicles, jobServices, serviceItems, socialPosts } from "@/src/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const { jobId } = await req.json();
    if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

    const db = getDb();

    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const [customer, vehicle, svcs] = await Promise.all([
      job.customerId
        ? db.select({ name: customers.name, city: customers.city }).from(customers).where(eq(customers.id, job.customerId)).limit(1).then(r => r[0])
        : null,
      job.vehicleId
        ? db.select().from(vehicles).where(eq(vehicles.id, job.vehicleId)).limit(1).then(r => r[0])
        : null,
      db.select({ serviceItem: serviceItems }).from(jobServices)
        .leftJoin(serviceItems, eq(jobServices.serviceItemId, serviceItems.id))
        .where(eq(jobServices.jobId, jobId)),
    ]);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

    const vehicleStr = vehicle
      ? `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.color ? ` (${vehicle.color})` : ""}`
      : "Vehicle";
    const servicesList = svcs.map((s) => s.serviceItem?.name || "").filter(Boolean).join(", ");
    const city = customer?.city || job.city || "Houston";

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: `Write social media captions for a premium mobile car detailing business called Fresh Path Mobile Detailing in the Houston/Katy/Richmond TX area.

Job details:
- Vehicle: ${vehicleStr}
- Services performed: ${servicesList}
- Location: ${city}, TX

Write 3 versions as JSON with this format:
{
  "instagram": "Instagram caption with 15-20 relevant hashtags",
  "tiktok": "Short TikTok caption with 5-8 trending hashtags",
  "google": "Google Business Profile post with booking CTA"
}

Tone: Premium, confident, results-focused. Never use "cheap" or "affordable." Emphasize transformation, convenience, and quality. Minimal emojis.`,
        }],
      }),
    });

    if (!res.ok) return NextResponse.json({ error: "AI generation failed" }, { status: 502 });

    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    let captions = { instagram: "", tiktok: "", google: "" };
    if (jsonMatch) {
      try { captions = JSON.parse(jsonMatch[0]); } catch { /* use defaults */ }
    }

    // Save as social posts
    const posts = await Promise.all(
      (["instagram", "tiktok", "google"] as const).map((platform) =>
        db.insert(socialPosts).values({
          jobId,
          customerId: job.customerId,
          type: "before_after",
          platform,
          caption: captions[platform] || "",
          status: "draft",
        }).returning().then(r => r[0])
      )
    );

    return NextResponse.json({ captions, posts });
  } catch (error) {
    console.error("Social post error:", error);
    return NextResponse.json({ error: "Failed to generate social posts" }, { status: 500 });
  }
}
