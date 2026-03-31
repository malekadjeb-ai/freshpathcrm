import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { tenants } from "@/src/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { tenantId } = auth;

  const db = getDb();
  const [tenant] = await db
    .select({
      plan: tenants.plan,
      status: tenants.status,
      billingSubscriptionId: tenants.billingSubscriptionId,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId));

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json({
    plan: tenant.plan,
    status: tenant.status,
    hasSubscription: !!tenant.billingSubscriptionId,
  });
}
