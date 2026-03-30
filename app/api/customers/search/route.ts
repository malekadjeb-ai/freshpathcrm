import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { or, and, eq, isNotNull, like, desc, inArray } from "drizzle-orm";
import { customers, vehicles } from "@/src/db/schema";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const q = req.nextUrl.searchParams.get("q") || "";

    // If no query, return recently contacted customers
    if (!q.trim()) {
      const recent = await db
        .select({
          id: customers.id,
          name: customers.name,
          phone: customers.phone,
          lastJobAt: customers.lastJobAt,
        })
        .from(customers)
        .where(and(isNotNull(customers.lastContactedAt), eq(customers.tenantId, tenantId)))
        .orderBy(desc(customers.lastContactedAt))
        .limit(5);

      const recentIds = recent.map((c) => c.id);
      const vehicleRows = recentIds.length
        ? await db
            .select()
            .from(vehicles)
            .where(inArray(vehicles.customerId, recentIds))
        : [];

      const vehicleByCustomer: Record<string, typeof vehicles.$inferSelect | undefined> = {};
      for (const v of vehicleRows) {
        if (!vehicleByCustomer[v.customerId]) {
          vehicleByCustomer[v.customerId] = v;
        }
      }

      return NextResponse.json(
        recent.map((c) => {
          const v = vehicleByCustomer[c.id];
          return {
            id: c.id,
            name: c.name,
            phone: c.phone,
            lastJobAt: c.lastJobAt,
            vehicleSummary: v ? `${v.year} ${v.make} ${v.model}` : null,
          };
        })
      );
    }

    // Check if query looks like a phone number (4+ digits)
    const digits = q.replace(/\D/g, "");
    const isPhoneSearch = digits.length >= 4;

    const conditions = [like(customers.name, `%${q}%`)];
    if (isPhoneSearch) conditions.push(like(customers.phone, `%${digits}%`));
    if (q.includes("@")) conditions.push(like(customers.email, `%${q}%`));

    const results = await db
      .select({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        lastJobAt: customers.lastJobAt,
      })
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), or(...conditions)!))
      .orderBy(desc(customers.lastContactedAt))
      .limit(10);

    const resultIds = results.map((c) => c.id);
    const vehicleRows = resultIds.length
      ? await db
          .select()
          .from(vehicles)
          .where(inArray(vehicles.customerId, resultIds))
      : [];

    const vehicleByCustomer: Record<string, typeof vehicles.$inferSelect | undefined> = {};
    for (const v of vehicleRows) {
      if (!vehicleByCustomer[v.customerId]) {
        vehicleByCustomer[v.customerId] = v;
      }
    }

    return NextResponse.json(
      results.map((c) => {
        const v = vehicleByCustomer[c.id];
        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          lastJobAt: c.lastJobAt,
          vehicleSummary: v ? `${v.year} ${v.make} ${v.model}` : null,
        };
      })
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
