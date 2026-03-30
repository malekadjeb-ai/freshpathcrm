import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { checklists } from "@/src/db/schema";
import { eq, desc } from "drizzle-orm";
import { checklistSchema } from "@/lib/validations/checklist";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const active = searchParams.get("active");

    let allChecklists;
    if (active === "true") {
      allChecklists = await db.select().from(checklists).where(eq(checklists.isActive, true)).orderBy(desc(checklists.createdAt));
    } else {
      allChecklists = await db.select().from(checklists).orderBy(desc(checklists.createdAt));
    }

    // Parse items JSON for each checklist
    const parsed = allChecklists.map((c) => ({
      ...c,
      items: JSON.parse(c.items),
    }));

    return NextResponse.json(parsed);
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
    const parsed = checklistSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    const [checklist] = await db.insert(checklists).values({
      name: data.name,
      serviceItemId: data.serviceItemId ?? null,
      items: JSON.stringify(data.items),
      isActive: data.isActive,
    }).returning();

    return NextResponse.json({ ...checklist, items: data.items }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
