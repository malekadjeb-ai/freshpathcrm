import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { fleetContracts, customers } from "@/src/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { fleetContractSchema } from "@/lib/validations/fleet-contract";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : null;
    const limit = Math.min(parseInt(searchParams.get("limit") || "25"), 100);

    // Pre-fetch tenant customer IDs for scoping
    const tenantCustRows = await db.select({ id: customers.id }).from(customers).where(eq(customers.tenantId, tenantId));
    const tenantCustIds = tenantCustRows.map(c => c.id);

    let allContracts;
    if (tenantCustIds.length === 0) {
      return NextResponse.json([]);
    } else if (customerId) {
      allContracts = await db.select().from(fleetContracts).where(and(eq(fleetContracts.customerId, customerId), inArray(fleetContracts.customerId, tenantCustIds))).orderBy(desc(fleetContracts.createdAt));
    } else {
      allContracts = await db.select().from(fleetContracts).where(inArray(fleetContracts.customerId, tenantCustIds)).orderBy(desc(fleetContracts.createdAt));
    }

    // Batch: fetch all related customers
    const contractCustIds = [...new Set(allContracts.map(c => c.customerId))];
    const contractCustBatch = contractCustIds.length
      ? await db.select({ id: customers.id, name: customers.name, companyName: customers.companyName }).from(customers).where(inArray(customers.id, contractCustIds))
      : [];
    const contractCustMap = new Map(contractCustBatch.map(c => [c.id, c]));

    const enriched = allContracts.map((contract) => ({
      ...contract,
      customer: contractCustMap.get(contract.customerId) ?? undefined,
    }));

    if (page) {
      const total = enriched.length;
      const paginatedResult = enriched.slice((page - 1) * limit, page * limit);
      return NextResponse.json({
        data: paginatedResult,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }
    return NextResponse.json(enriched);
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
    const parsed = fleetContractSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    // Verify customer belongs to tenant
    const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, data.customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!custCheck) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const [contract] = await db.insert(fleetContracts).values({
      customerId: data.customerId,
      name: data.name,
      frequency: data.frequency,
      pricePerVehicle: data.pricePerVehicle ?? null,
      flatRate: data.flatRate ?? null,
      vehicleCount: data.vehicleCount,
      startDate: new Date(data.startDate).toISOString(),
      endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
      isActive: data.isActive,
      notes: data.notes || null,
    }).returning();

    const [customer] = await db
      .select({ id: customers.id, name: customers.name, companyName: customers.companyName })
      .from(customers)
      .where(eq(customers.id, contract.customerId));

    return NextResponse.json({ ...contract, customer }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
