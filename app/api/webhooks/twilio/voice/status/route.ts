import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/src/db";
import { communications, customers, users, notifications } from "@/src/db/schema";
import { eq, or, like } from "drizzle-orm";

/**
 * POST /api/webhooks/twilio/voice/status
 * Receives call status updates from Twilio (initiated, ringing, answered, completed).
 */
export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);

    const callSid = params.get("CallSid");
    const callStatus = params.get("CallStatus");
    const duration = params.get("CallDuration"); // seconds, only on completed
    const recordingUrl = params.get("RecordingUrl");
    const from = params.get("From");
    const direction = params.get("Direction");

    if (!callSid || !callStatus) {
      return new NextResponse("OK", { status: 200 });
    }

    // Map Twilio statuses to our internal statuses
    const statusMap: Record<string, string> = {
      initiated: "initiated",
      ringing: "ringing",
      "in-progress": "in-progress",
      answered: "in-progress",
      completed: "completed",
      busy: "no-answer",
      "no-answer": "no-answer",
      failed: "failed",
      canceled: "missed",
    };

    const internalStatus = statusMap[callStatus] || callStatus;
    const now = new Date().toISOString();

    // Find existing communication by callSid
    const allComms = await db
      .select()
      .from(communications)
      .where(eq(communications.externalId, callSid));
    const comm = allComms[0] ?? null;

    if (comm) {
      const updateData: Record<string, unknown> = {
        status: internalStatus,
        updatedAt: now,
      };

      if (duration) {
        updateData.duration = parseInt(duration, 10);
      }

      if (callStatus === "completed") {
        updateData.outcome = "completed";
        updateData.deliveredAt = now;
      } else if (callStatus === "no-answer" || callStatus === "busy") {
        updateData.outcome = "no_answer";
      } else if (callStatus === "failed" || callStatus === "canceled") {
        updateData.outcome = callStatus;
      }

      if (recordingUrl) {
        updateData.body = recordingUrl;
      }

      await db.update(communications).set(updateData).where(eq(communications.id, comm.id));
    } else if (direction === "inbound" && callStatus === "ringing") {
      // New inbound call - create communication record
      const normalizedPhone = (from || "").replace(/\D/g, "").slice(-10);

      const allCustomers = await db
        .select()
        .from(customers)
        .where(
          or(
            like(customers.phone, `%${normalizedPhone}%`),
            eq(customers.phone, from || "")
          )
        );
      const customer = allCustomers.find((c) => c.deletedAt === null) ?? null;

      // Auto-create customer for unknown callers
      let customerId = customer?.id;
      if (!customerId) {
        const [newCustomer] = await db.insert(customers).values({
          name: from || "Unknown Caller",
          phone: from,
          source: "Inbound Call",
          lifecycleStage: "New",
        }).returning();
        customerId = newCustomer.id;
      }

      await db.insert(communications).values({
        customerId,
        type: "call",
        direction: "inbound",
        status: "ringing",
        summary: `Inbound call from ${customer?.name || from}`,
        externalId: callSid,
        channel: "call",
        source: "twilio",
      });

      // Notify team of incoming call
      const allUsers = await db.select({ id: users.id }).from(users);
      for (const user of allUsers) {
        await db.insert(notifications).values({
          userId: user.id,
          title: `Incoming call from ${customer?.name || from}`,
          message: `${customer?.phone || from} is calling`,
          type: "info",
          link: `/communications`,
        });
      }

      await db.update(customers)
        .set({ lastContactedAt: now, updatedAt: now })
        .where(eq(customers.id, customerId));
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Twilio voice status error:", error);
    return new NextResponse("OK", { status: 200 });
  }
}
