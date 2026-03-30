import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { customers } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const body = await req.json();
    const { address, customerId } = body;

    if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      {
        headers: {
          "User-Agent": "FreshPathCRM/1.0",
        },
      }
    );

    if (!res.ok) return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });

    const results = await res.json();
    if (results.length === 0) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    const { lat, lon } = results[0];
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (customerId) {
      const db = getDb();
      // Only update if customer belongs to tenant
      await db.update(customers).set({
        latitude,
        longitude,
        updatedAt: new Date().toISOString(),
      }).where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)));
    }

    return NextResponse.json({ latitude, longitude });
  } catch (error) {
    console.error("Geocode error:", error);
    return NextResponse.json({ error: "Geocoding failed" }, { status: 500 });
  }
}
