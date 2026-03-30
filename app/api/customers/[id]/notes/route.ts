import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { eq, and } from "drizzle-orm";
import { customerNotes, customers } from "@/src/db/schema";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();

    // Verify customer belongs to tenant
    const [customer] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, params.id), eq(customers.tenantId, tenantId))).limit(1);
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const { content } = await req.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: "Note content required" }, { status: 400 });
    }

    const [note] = await db
      .insert(customerNotes)
      .values({ customerId: params.id, content })
      .returning();

    return NextResponse.json(note, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
