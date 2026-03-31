import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { extractDataFromMessage } from "@/lib/services/auto-capture";
import { getDb } from "@/src/db";
import { customers, vehicles } from "@/src/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    const body = await req.json();
    const { messageText, customerId } = body;

    if (!messageText || typeof messageText !== "string") {
      return NextResponse.json({ error: "messageText is required" }, { status: 400 });
    }

    let existingCustomerData: Record<string, unknown> | undefined;

    if (customerId) {
      const db = getDb();
      const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
      if (customer) {
        const customerVehicles = await db.select().from(vehicles).where(eq(vehicles.customerId, customerId));
        existingCustomerData = {
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          vehicles: customerVehicles.map((v) => ({
            year: v.year,
            make: v.make,
            model: v.model,
            color: v.color,
          })),
        };
      }
    }

    const extracted = await extractDataFromMessage(messageText, existingCustomerData);

    return NextResponse.json({ extracted });
  } catch (error) {
    console.error("AI extract error:", error);
    return NextResponse.json({ error: "Failed to extract data" }, { status: 500 });
  }
}
