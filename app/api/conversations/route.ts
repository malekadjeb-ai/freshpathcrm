import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { communications, customers, leads } from "@/src/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";

/**
 * GET /api/conversations
 * Returns conversation threads grouped by customer OR lead, with the latest message and unread count.
 * Lead threads are tagged with isLead: true so the UI can distinguish them.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { tenantId } = auth;

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : null;
    const limit = Math.min(parseInt(searchParams.get("limit") || "25"), 100);

    // ─── Customer threads ───────────────────────────────────────
    // Get customers that have sms/email communications
    const commTypes = ["sms", "email"];

    // Find customer IDs that have qualifying comms
    const customerComms = await db
      .select({
        customerId: communications.customerId,
        id: communications.id,
        type: communications.type,
        direction: communications.direction,
        status: communications.status,
        summary: communications.summary,
        body: communications.body,
        createdAt: communications.createdAt,
      })
      .from(communications)
      .where(
        and(
          isNull(communications.deletedAt),
          inArray(communications.type, commTypes)
        )
      )
      .orderBy(communications.createdAt);

    // Get all customers (we'll filter by those with comms)
    const customerIdSet = new Set(
      customerComms
        .filter((c) => c.customerId !== null)
        .map((c) => c.customerId as string)
    );

    if (customerIdSet.size === 0 && !search) {
      // No customer comms — skip to leads
    }

    let customerRows = await db
      .select({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        email: customers.email,
        lastContactedAt: customers.lastContactedAt,
      })
      .from(customers)
      .where(and(isNull(customers.deletedAt), eq(customers.tenantId, tenantId)));

    if (search) {
      const s = search.toLowerCase();
      customerRows = customerRows.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          c.phone?.toLowerCase().includes(s) ||
          c.email?.toLowerCase().includes(s)
      );
    }

    // Filter to those with qualifying comms
    customerRows = customerRows.filter((c) => customerIdSet.has(c.id));

    const customerThreads = customerRows.map((c) => {
      const comms = customerComms
        .filter((m) => m.customerId === c.id)
        .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

      const unreadCount = customerComms.filter(
        (m) =>
          m.customerId === c.id &&
          m.direction === "inbound" &&
          m.status === "received"
      ).length;

      return {
        customerId: c.id,
        leadId: null as string | null,
        isLead: false,
        customerName: c.name,
        customerPhone: c.phone,
        customerEmail: c.email,
        lastMessage: comms[0] || null,
        unreadCount,
      };
    });

    // ─── Lead threads ───────────────────────────────────────────
    const leadComms = await db
      .select({
        leadId: communications.leadId,
        id: communications.id,
        type: communications.type,
        direction: communications.direction,
        status: communications.status,
        summary: communications.summary,
        body: communications.body,
        createdAt: communications.createdAt,
      })
      .from(communications)
      .where(
        and(
          isNull(communications.deletedAt),
          inArray(communications.type, commTypes)
        )
      )
      .orderBy(communications.createdAt);

    const leadIdSet = new Set(
      leadComms
        .filter((c) => c.leadId !== null)
        .map((c) => c.leadId as string)
    );

    let leadRows = await db
      .select({
        id: leads.id,
        name: leads.name,
        phone: leads.phone,
        email: leads.email,
        status: leads.status,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .where(eq(leads.tenantId, tenantId));

    if (search) {
      const s = search.toLowerCase();
      leadRows = leadRows.filter(
        (l) =>
          l.name.toLowerCase().includes(s) ||
          l.phone?.toLowerCase().includes(s) ||
          l.email?.toLowerCase().includes(s)
      );
    }

    leadRows = leadRows.filter((l) => leadIdSet.has(l.id));

    const leadThreads = leadRows.map((l) => {
      const comms = leadComms
        .filter((m) => m.leadId === l.id)
        .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

      const unreadCount = leadComms.filter(
        (m) =>
          m.leadId === l.id &&
          m.direction === "inbound" &&
          m.status === "received"
      ).length;

      return {
        customerId: null as string | null,
        leadId: l.id,
        isLead: true,
        customerName: `${l.name} (Lead)`,
        customerPhone: l.phone,
        customerEmail: l.email,
        lastMessage: comms[0] || null,
        unreadCount,
      };
    });

    // ─── Merge & sort by last message time ──────────────────────
    const allThreads = [...customerThreads, ...leadThreads].sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    if (page) {
      const total = allThreads.length;
      const paginatedResult = allThreads.slice((page - 1) * limit, page * limit);
      return NextResponse.json({
        data: paginatedResult,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }
    return NextResponse.json(allThreads);
  } catch (error) {
    console.error("Conversations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
