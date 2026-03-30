import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { communications, customers, businessSettings } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";
import nodemailer from "nodemailer";

const CARRIER_GATEWAYS: Record<string, string> = {
  att: "txt.att.net",
  verizon: "vtext.com",
  "t-mobile": "tmomail.net",
  tmobile: "tmomail.net",
  sprint: "messaging.sprintpcs.com",
  boost: "sms.myboostmobile.com",
  virgin: "vmomail.com",
  uscellular: "mms.uscc.net",
};

function formatPhoneForEmail(phone: string): string {
  const digits = phone.replace(/\D/g, "").slice(-10);
  return digits;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const body = await req.json();
    const { customerId, to, body: message, carrier } = body;

    if (!to || !message) {
      return NextResponse.json(
        { error: "Missing to or message" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Verify customer belongs to tenant if customerId provided
    if (customerId) {
      const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId))).limit(1);
      if (!custCheck) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const [settings] = await db.select().from(businessSettings).where(eq(businessSettings.tenantId, tenantId));

    if (!settings?.enableEmailToSMS) {
      return NextResponse.json(
        { error: "Email-to-SMS is not enabled" },
        { status: 400 }
      );
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;

    if (!smtpHost || !smtpUser || !smtpPassword) {
      return NextResponse.json(
        { error: "SMTP settings not configured" },
        { status: 400 }
      );
    }

    // Determine carrier gateway
    const carrierGateway = carrier
      ? CARRIER_GATEWAYS[carrier.toLowerCase()]
      : null;

    if (!carrierGateway) {
      return NextResponse.json(
        {
          error: "Carrier not specified or unsupported",
          supportedCarriers: Object.keys(CARRIER_GATEWAYS),
        },
        { status: 400 }
      );
    }

    // Format SMS email
    const phoneDigits = formatPhoneForEmail(to);
    const smsEmail = `${phoneDigits}@${carrierGateway}`;

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    // Send email as SMS
    const info = await transporter.sendMail({
      from: settings?.senderEmail || smtpUser,
      to: smsEmail,
      subject: message.substring(0, 50),
      text: message,
    });

    // Log communication record
    if (customerId) {
      await db.insert(communications).values({
        customerId,
        type: "sms",
        direction: "outbound",
        status: "sent",
        summary: message.length > 200 ? message.substring(0, 200) + "..." : message,
        body: message,
        externalId: info.messageId,
        channel: "email-sms",
      });

      await db
        .update(customers)
        .set({ lastContactedAt: new Date().toISOString() })
        .where(eq(customers.id, customerId));
    }

    return NextResponse.json({
      success: true,
      method: "email-sms",
      messageId: info.messageId,
    });
  } catch (error) {
    console.error("Send SMS via email error:", error);
    return NextResponse.json(
      { error: "Failed to send SMS via email" },
      { status: 500 }
    );
  }
}
