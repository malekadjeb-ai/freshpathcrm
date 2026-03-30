import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { eq, and } from "drizzle-orm";
import { vehicles, customers } from "@/src/db/schema";
import { vehicleSchema } from "@/lib/validations/customer";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();

    // Verify customer belongs to tenant
    const [customer] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, params.id), eq(customers.tenantId, tenantId))).limit(1);
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    const body = await req.json();
    const data = vehicleSchema.parse(body);

    const [vehicle] = await db
      .insert(vehicles)
      .values({ ...data, customerId: params.id })
      .returning();

    return NextResponse.json(vehicle, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
