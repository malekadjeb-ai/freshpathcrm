import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { customers } from "@/src/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const { criteria, type } = await req.json();
    const parsed = typeof criteria === "string" ? JSON.parse(criteria) : criteria;

    let allCustomers = await db.select().from(customers).where(and(isNull(customers.deletedAt), eq(customers.tenantId, tenantId)));

    if (parsed.lifecycleStage) {
      allCustomers = allCustomers.filter((c) => c.lifecycleStage === parsed.lifecycleStage);
    }
    if (parsed.city) {
      allCustomers = allCustomers.filter((c) => c.city === parsed.city);
    }
    if (parsed.source) {
      allCustomers = allCustomers.filter((c) => c.source === parsed.source);
    }

    if (type === "sms") {
      allCustomers = allCustomers.filter((c) => c.phone !== null);
    } else if (type === "email") {
      allCustomers = allCustomers.filter((c) => c.email !== null);
    } else if (type === "both") {
      allCustomers = allCustomers.filter((c) => c.phone !== null || c.email !== null);
    }

    const count = allCustomers.length;
    const sample = allCustomers
      .sort((a, b) => (a.name > b.name ? 1 : -1))
      .slice(0, 10)
      .map((c) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email }));

    return NextResponse.json({ count, sample });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
