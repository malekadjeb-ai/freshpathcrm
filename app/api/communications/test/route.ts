import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { businessSettings } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { sendEmailDirect } from "@/lib/services/email";
import { sendSMSDirect } from "@/lib/services/sms";

/**
 * Test email or SMS configuration by sending a test message.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const { channel, to } = await req.json();

    if (!channel || !["email", "sms"].includes(channel)) {
      return NextResponse.json({ error: "channel must be 'email' or 'sms'" }, { status: 400 });
    }
    if (!to) {
      return NextResponse.json({ error: "Recipient (to) is required" }, { status: 400 });
    }

    const db = getDb();
    const [settings] = await db.select().from(businessSettings).where(eq(businessSettings.tenantId, tenantId));

    if (channel === "email") {
      const result = await sendEmailDirect(
        {
          to,
          subject: "Fresh Path CRM — Test Email",
          html: `<h2>Email is working!</h2><p>This is a test email from Fresh Path CRM sent at ${new Date().toLocaleString()}.</p><p>Your email integration is configured correctly.</p>`,
          text: `Email is working! This is a test email from Fresh Path CRM sent at ${new Date().toLocaleString()}.`,
        },
        {
          emailProvider: settings?.emailProvider,
          senderEmail: settings?.senderEmail,
          emailFromName: settings?.emailFromName,
          businessName: settings?.businessName,
          googleEmail: settings?.googleEmail,
        }
      );

      return NextResponse.json(result);
    }

    if (channel === "sms") {
      const result = await sendSMSDirect(
        {
          to,
          body: `Fresh Path CRM test — SMS is working! Sent at ${new Date().toLocaleTimeString()}.`,
        }
      );

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown channel" }, { status: 400 });
  } catch (error) {
    console.error("Test send error:", error);
    return NextResponse.json({ error: "Test failed" }, { status: 500 });
  }
}
