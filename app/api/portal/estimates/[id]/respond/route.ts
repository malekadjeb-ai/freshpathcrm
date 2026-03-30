import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/src/db";
import { customers, portalSessions, estimates, users, notifications } from "@/src/db/schema";
import { eq, and, gte, isNull } from "drizzle-orm";

async function getPortalCustomer(req: NextRequest) {
  const token = req.cookies.get("portal-session")?.value;
  if (!token) return null;

  const db = getDb();
  const session = await db.select().from(portalSessions).where(
    and(
      eq(portalSessions.token, token),
      gte(portalSessions.expiresAt, new Date().toISOString())
    )
  ).limit(1).then(r => r[0]);

  if (!session) return null;

  const customer = await db.select().from(customers).where(eq(customers.id, session.customerId)).limit(1).then(r => r[0]);
  return customer ?? null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customer = await getPortalCustomer(req);
    if (!customer) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { action, reason } = body;

    if (!["approve", "decline"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const db = getDb();
    const estimate = await db.select().from(estimates).where(
      and(
        eq(estimates.id, params.id),
        eq(estimates.customerId, customer.id),
        isNull(estimates.deletedAt)
      )
    ).limit(1).then(r => r[0]);

    if (!estimate) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    if (!["Sent", "Viewed"].includes(estimate.status)) {
      return NextResponse.json({ error: "Estimate cannot be responded to" }, { status: 400 });
    }

    const newStatus = action === "approve" ? "Accepted" : "Declined";

    await db.update(estimates).set({
      status: newStatus,
      respondedAt: new Date().toISOString(),
      notes: action === "decline" && reason
        ? `${estimate.notes ? estimate.notes + "\n" : ""}Declined reason: ${reason}`
        : estimate.notes,
      updatedAt: new Date().toISOString(),
    }).where(eq(estimates.id, params.id));

    // Create notification for business owner
    const allUsers = await db.select({ id: users.id }).from(users);
    for (const user of allUsers) {
      await db.insert(notifications).values({
        userId: user.id,
        type: action === "approve" ? "estimate_approved" : "estimate_declined",
        title: `Estimate ${newStatus}`,
        message: `${customer.name} ${action === "approve" ? "approved" : "declined"} estimate #${estimate.estimateNumber}${reason ? ` — "${reason}"` : ""}`,
        link: `/estimates/${estimate.id}`,
      });
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error("Portal estimate respond error:", error);
    return NextResponse.json({ error: "Failed to update estimate" }, { status: 500 });
  }
}
