import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { socialPosts } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const socialPostSchema = z.object({
  caption: z.string().min(1),
  type: z.string().optional(),
  platform: z.string().optional(),
  imageUrl: z.string().optional(),
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

    let posts = await db
      .select()
      .from(socialPosts)
      .orderBy(socialPosts.createdAt);

    if (status) posts = posts.filter((p) => p.status === status);
    if (platform) posts = posts.filter((p) => p.platform === platform);

    posts.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

    return NextResponse.json(posts.slice(0, 50));
  } catch (error) {
    console.error("Social posts error:", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const body = await req.json();
    const parsed = socialPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    const [post] = await db
      .insert(socialPosts)
      .values({
        caption: data.caption,
        type: data.type || undefined,
        platform: data.platform || undefined,
        imageUrl: data.imageUrl || undefined,
        status: "draft",
      })
      .returning();

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("Create social post error:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const body = await req.json();
    const { id, caption, status, scheduledAt } = body;

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (caption !== undefined) updateData.caption = caption;
    if (status) updateData.status = status;
    if (scheduledAt) updateData.scheduledAt = new Date(scheduledAt).toISOString();

    await db.update(socialPosts).set(updateData).where(eq(socialPosts.id, id));

    const [updated] = await db.select().from(socialPosts).where(eq(socialPosts.id, id));

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update social post error:", error);
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
}
