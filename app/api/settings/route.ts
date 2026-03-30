import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { eq } from "drizzle-orm";
import { businessSettings } from "@/src/db/schema";
import { settingsSchema } from "@/lib/validations/settings";

const SENSITIVE_FIELDS = [
  "googleAccessToken",
  "googleRefreshToken",
];

function stripSecrets<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const safe = { ...obj };
  for (const key of SENSITIVE_FIELDS) {
    if (key in safe) {
      (safe as Record<string, unknown>)[key] = safe[key] ? "••••••••" : null;
    }
  }
  return safe;
}

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });

    const db = getDb();
    let settings = await db.select().from(businessSettings).where(eq(businessSettings.tenantId, tenantId)).limit(1).then(r => r[0]);
    if (!settings) {
      settings = await db.insert(businessSettings).values({ tenantId }).returning().then(r => r[0]);
    }

    return NextResponse.json(stripSecrets(settings as unknown as Record<string, unknown>));
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const body = await req.json();
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    // Strip null values and masked secrets — don't overwrite real secrets with mask
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value === undefined) continue;
      if (SENSITIVE_FIELDS.includes(key) && value === "••••••••") continue;
      data[key] = value;
    }
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });

    const db = getDb();
    let settings = await db.select().from(businessSettings).where(eq(businessSettings.tenantId, tenantId)).limit(1).then(r => r[0]);
    if (!settings) {
      settings = await db.insert(businessSettings).values({ ...data, tenantId } as typeof businessSettings.$inferInsert).returning().then(r => r[0]);
    } else {
      settings = await db.update(businessSettings).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(businessSettings.id, settings.id)).returning().then(r => r[0]);
    }

    return NextResponse.json(stripSecrets(settings as unknown as Record<string, unknown>));
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
