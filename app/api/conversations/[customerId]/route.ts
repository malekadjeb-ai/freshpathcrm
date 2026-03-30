import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { communications, customers, leads } from "@/src/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";

/**
 * GET /api/conversations/:customerId
 * Returns all SMS & email messages for a customer or lead, ordered chronologically.
 * Accepts customerId or leadId — tries customer first, then lead.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { tenantId } = auth;

    const db = getDb();
    const { customerId: contactId } = await params;

    // Try customer first (scoped to tenant)
    const [customer] = await db
      .select({ id: customers.id, name: customers.name, phone: customers.phone, email: customers.email })
      .from(customers)
      .where(and(eq(customers.id, contactId), eq(customers.tenantId, tenantId)));

    if (customer) {
      const messages = await db
        .select({
          id: communications.id,
          type: communications.type,
          direction: communications.direction,
          status: communications.status,
          summary: communications.summary,
          body: communications.body,
          channel: communications.channel,
          externalId: communications.externalId,
          createdAt: communications.createdAt,
          deliveredAt: communications.deliveredAt,
        })
        .from(communications)
        .where(
          and(
            eq(communications.customerId, contactId),
            isNull(communications.deletedAt),
            inArray(communications.type, ["sms", "email"])
          )
        )
        .orderBy(communications.createdAt);

      // Mark inbound messages as "read"
      await db
        .update(communications)
        .set({ status: "read", updatedAt: new Date().toISOString() })
        .where(
          and(
            eq(communications.customerId, contactId),
            eq(communications.direction, "inbound"),
            eq(communications.status, "received"),
            inArray(communications.type, ["sms", "email"]),
            isNull(communications.deletedAt)
          )
        );

      return NextResponse.json({ customer, messages, isLead: false });
    }

    // Try lead (scoped to tenant)
    const [lead] = await db
      .select({ id: leads.id, name: leads.name, phone: leads.phone, email: leads.email, status: leads.status })
      .from(leads)
      .where(and(eq(leads.id, contactId), eq(leads.tenantId, tenantId)));

    if (lead) {
      const messages = await db
        .select({
          id: communications.id,
          type: communications.type,
          direction: communications.direction,
          status: communications.status,
          summary: communications.summary,
          body: communications.body,
          channel: communications.channel,
          externalId: communications.externalId,
          createdAt: communications.createdAt,
          deliveredAt: communications.deliveredAt,
        })
        .from(communications)
        .where(
          and(
            eq(communications.leadId, contactId),
            isNull(communications.deletedAt),
            inArray(communications.type, ["sms", "email"])
          )
        )
        .orderBy(communications.createdAt);

      // Mark inbound messages as "read"
      await db
        .update(communications)
        .set({ status: "read", updatedAt: new Date().toISOString() })
        .where(
          and(
            eq(communications.leadId, contactId),
            eq(communications.direction, "inbound"),
            eq(communications.status, "received"),
            inArray(communications.type, ["sms", "email"]),
            isNull(communications.deletedAt)
          )
        );

      return NextResponse.json({
        customer: { id: lead.id, name: lead.name, phone: lead.phone, email: lead.email },
        messages,
        isLead: true,
        leadStatus: lead.status,
      });
    }

    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  } catch (error) {
    console.error("Conversation detail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
