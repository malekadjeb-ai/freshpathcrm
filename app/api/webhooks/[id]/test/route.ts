import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { webhookEndpoints } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { fireWebhooks } from "@/lib/webhooks";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    const db = getDb();
    const [endpoint] = await db.select().from(webhookEndpoints).where(eq(webhookEndpoints.id, params.id));
    if (!endpoint) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Send a test event
    fireWebhooks("webhook.test", {
      message: "This is a test webhook delivery",
      endpointId: endpoint.id,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, message: "Test webhook queued" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
