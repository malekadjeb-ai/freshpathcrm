import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { eq, and, or, desc, asc, isNull, like, count, inArray } from "drizzle-orm";
import { customers, customerTags, tags, vehicles, jobs } from "@/src/db/schema";
import { customerSchema } from "@/lib/validations/customer";
import { fireWebhooks } from "@/lib/webhooks";
import { triggerWorkflows } from "@/lib/services/workflow-engine";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const city = searchParams.get("city") || "";
    const tag = searchParams.get("tag") || "";
    const sort = searchParams.get("sort") || "createdAt";
    const order = searchParams.get("order") || "desc";
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : null;
    const limit = Math.min(parseInt(searchParams.get("limit") || "25"), 500);

    const commercial = searchParams.get("commercial");

    // Build where conditions
    const conditions = [isNull(customers.deletedAt), eq(customers.tenantId, tenantId)];

    if (search) {
      conditions.push(
        or(
          like(customers.name, `%${search}%`),
          like(customers.email, `%${search}%`),
          like(customers.phone, `%${search}%`),
          like(customers.companyName, `%${search}%`)
        )!
      );
    }

    if (city) {
      conditions.push(like(customers.city, `%${city}%`));
    }

    if (commercial === "true") {
      conditions.push(eq(customers.isCommercial, true));
    }

    // Determine sort column
    const sortCol =
      sort === "name" ? customers.name :
      sort === "createdAt" ? customers.createdAt :
      sort === "lastJobAt" ? customers.lastJobAt :
      sort === "lastContactedAt" ? customers.lastContactedAt :
      customers.createdAt;

    const orderFn = order === "asc" ? asc : desc;

    // Tag filter — get matching customer IDs first
    let tagFilterIds: string[] | null = null;
    if (tag) {
      const tagRow = await db
        .select({ id: tags.id })
        .from(tags)
        .where(eq(tags.name, tag))
        .limit(1);
      if (tagRow[0]) {
        const rows = await db
          .select({ customerId: customerTags.customerId })
          .from(customerTags)
          .where(eq(customerTags.tagId, tagRow[0].id));
        tagFilterIds = rows.map((r) => r.customerId);
      } else {
        tagFilterIds = [];
      }
    }

    // Fetch all (or paginated) customers
    let allCustomers;
    if (page) {
      allCustomers = await db
        .select()
        .from(customers)
        .where(and(...conditions))
        .orderBy(orderFn(sortCol))
        .offset((page - 1) * limit)
        .limit(limit);
    } else {
      allCustomers = await db
        .select()
        .from(customers)
        .where(and(...conditions))
        .orderBy(orderFn(sortCol));
    }

    // Apply tag filter in JS if needed
    if (tagFilterIds !== null) {
      const idSet = new Set(tagFilterIds);
      allCustomers = allCustomers.filter((c) => idSet.has(c.id));
    }

    // Fetch total count
    const totalResult = await db
      .select({ count: count() })
      .from(customers)
      .where(and(...conditions));
    let total = totalResult[0]?.count ?? 0;
    if (tagFilterIds !== null) {
      total = tagFilterIds.length;
    }

    // Enrich with tags, vehicles, jobs in parallel
    const customerIds = allCustomers.map((c) => c.id);

    const [allTags, allVehicles, allJobs] = await Promise.all([
      customerIds.length
        ? db.select().from(tags)
            .innerJoin(customerTags, eq(tags.id, customerTags.tagId))
            .where(inArray(customerTags.customerId, customerIds))
        : Promise.resolve([]),
      customerIds.length
        ? db.select().from(vehicles).where(inArray(vehicles.customerId, customerIds))
        : Promise.resolve([]),
      customerIds.length
        ? db
            .select({ customerId: jobs.customerId, total: jobs.total, completedAt: jobs.completedAt, status: jobs.status, createdAt: jobs.createdAt })
            .from(jobs)
            .where(
              and(
                isNull(jobs.deletedAt),
                inArray(jobs.customerId, customerIds)
              )
            )
        : Promise.resolve([]),
    ]);

    // Build lookup maps
    const tagsByCustomer: Record<string, typeof tags.$inferSelect[]> = {};
    for (const row of allTags as Array<{ Tag: typeof tags.$inferSelect; _CustomerTags: typeof customerTags.$inferSelect }>) {
      const cId = row._CustomerTags.customerId;
      if (!tagsByCustomer[cId]) tagsByCustomer[cId] = [];
      tagsByCustomer[cId].push(row.Tag);
    }

    const vehiclesByCustomer: Record<string, typeof vehicles.$inferSelect[]> = {};
    for (const v of allVehicles as typeof vehicles.$inferSelect[]) {
      if (!vehiclesByCustomer[v.customerId]) vehiclesByCustomer[v.customerId] = [];
      vehiclesByCustomer[v.customerId].push(v);
    }

    const jobsByCustomer: Record<string, Array<{ customerId: string; total: number; completedAt: string | null; status: string; createdAt: string }>> = {};
    for (const j of allJobs as Array<{ customerId: string; total: number; completedAt: string | null; status: string; createdAt: string }>) {
      if (!jobsByCustomer[j.customerId]) jobsByCustomer[j.customerId] = [];
      jobsByCustomer[j.customerId].push(j);
    }

    const enriched = allCustomers.map((c) => {
      const cJobs = jobsByCustomer[c.id] ?? [];
      return {
        ...c,
        tags: tagsByCustomer[c.id] ?? [],
        vehicles: vehiclesByCustomer[c.id] ?? [],
        jobs: cJobs,
        totalSpent: cJobs.reduce((sum, j) => sum + j.total, 0),
        jobCount: cJobs.length,
        lastServiceDate:
          cJobs
            .filter((j) => j.completedAt)
            .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[0]
            ?.completedAt ?? null,
      };
    });

    if (page) {
      return NextResponse.json({
        data: enriched,
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
    const data = customerSchema.parse(body);

    const [customer] = await db
      .insert(customers)
      .values({
        tenantId,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        zip: data.zip || null,
        neighborhood: data.neighborhood || null,
        referredById: data.referredById || null,
        isCommercial: data.isCommercial || false,
        companyName: data.companyName || null,
        taxId: data.taxId || null,
        billingEmail: data.billingEmail || null,
        billingContact: data.billingContact || null,
        paymentTerms: data.paymentTerms || null,
        fleetSize: data.fleetSize ?? null,
        fleetDiscount: data.fleetDiscount ?? null,
        contractNotes: data.contractNotes || null,
      })
      .returning();

    // Handle tags
    if (data.tagIds?.length) {
      await db.insert(customerTags).values(
        data.tagIds.map((tagId) => ({ customerId: customer.id, tagId }))
      );
    }

    // Fetch tags and vehicles for response
    const [customerTagRows, customerVehicles] = await Promise.all([
      db
        .select({ tag: tags })
        .from(tags)
        .innerJoin(customerTags, and(eq(tags.id, customerTags.tagId), eq(customerTags.customerId, customer.id))),
      db.select().from(vehicles).where(eq(vehicles.customerId, customer.id)),
    ]);

    const result = {
      ...customer,
      tags: customerTagRows.map((r) => r.tag),
      vehicles: customerVehicles,
    };

    const customerData = {
      id: customer.id,
      customerId: customer.id,
      customerName: customer.name,
      name: customer.name,
      email: customer.email,
      customerEmail: customer.email,
      phone: customer.phone,
      customerPhone: customer.phone,
    };
    fireWebhooks("customer.created", customerData);
    triggerWorkflows("customer.created", customerData);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
