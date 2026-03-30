import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/src/db";
import { communications, customers, users, notifications } from "@/src/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/webhooks/twilio/voice/voicemail
 * Handles voicemail recordings from Twilio.
 */
export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);

    const callSid = params.get("CallSid");
    const recordingUrl = params.get("RecordingUrl");
    const recordingDuration = params.get("RecordingDuration");
    const transcriptionText = params.get("TranscriptionText");
    const from = params.get("From");

    // Find the call communication record
    let comm = null;
    if (callSid) {
      const allComms = await db
        .select()
        .from(communications)
        .where(eq(communications.externalId, callSid));
      comm = allComms[0] ?? null;
    }

    if (comm) {
      const summary = transcriptionText
        ? `Voicemail: ${transcriptionText.substring(0, 200)}`
        : "Voicemail received";

      await db.update(communications).set({
        status: "voicemail",
        outcome: "voicemail",
        body: recordingUrl || undefined,
        summary,
        duration: recordingDuration ? parseInt(recordingDuration, 10) : undefined,
        updatedAt: new Date().toISOString(),
      }).where(eq(communications.id, comm.id));

      // Notify team
      let customerName: string | null = null;
      if (comm.customerId) {
        const [customer] = await db
          .select({ name: customers.name })
          .from(customers)
          .where(eq(customers.id, comm.customerId));
        customerName = customer?.name ?? null;
      }

      const allUsers = await db.select({ id: users.id }).from(users);
      for (const user of allUsers) {
        await db.insert(notifications).values({
          userId: user.id,
          title: `Voicemail from ${customerName || from || "Unknown"}`,
          message: transcriptionText
            ? transcriptionText.substring(0, 100)
            : "New voicemail received",
          type: "info",
          link: "/communications",
        });
      }
    }

    // Respond with TwiML
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Thank you for your message. Goodbye.</Say></Response>`;
    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("Voicemail webhook error:", error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  }
}
