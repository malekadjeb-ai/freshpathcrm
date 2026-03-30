import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sendSMS, sendEmail, getTemplateVariables, resolveTemplate } from "@/lib/services/communication";
import { getDb } from "@/src/db";
import { customers } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/communications/send
 * Actually sends an SMS or Email through the configured provider (Twilio / Resend / SendGrid / SMTP).
 * Falls back to dev mode if no provider is configured.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { tenantId } = auth;

    const body = await req.json();
    const { channel, to, subject, message, customerId, jobId } = body;

    if (!channel || !to || !message) {
      return NextResponse.json(
        { error: "channel, to, and message are required" },
        { status: 400 }
      );
    }

    if (!["sms", "email"].includes(channel)) {
      return NextResponse.json(
        { error: "channel must be 'sms' or 'email'" },
        { status: 400 }
      );
    }

    // Verify customer belongs to tenant if customerId provided
    if (customerId) {
      const db = getDb();
      const [custCheck] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId))).limit(1);
      if (!custCheck) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Resolve template variables if a customer/job context is provided
    let resolvedMessage = message;
    let resolvedSubject = subject || "";
    if (customerId || jobId) {
      const vars = await getTemplateVariables(customerId, jobId);
      resolvedMessage = resolveTemplate(message, vars);
      if (resolvedSubject) {
        resolvedSubject = resolveTemplate(resolvedSubject, vars);
      }
    }

    if (channel === "sms") {
      const result = await sendSMS({
        to,
        body: resolvedMessage,
        customerId,
        jobId,
      });

      return NextResponse.json({
        success: result.success,
        mode: result.mode,
        communicationId: result.communicationId,
        error: result.error,
      });
    }

    // Email
    if (!resolvedSubject) {
      return NextResponse.json(
        { error: "subject is required for email" },
        { status: 400 }
      );
    }

    const result = await sendEmail({
      to,
      subject: resolvedSubject,
      body: resolvedMessage,
      html: `<div style="font-family: sans-serif; line-height: 1.6;">${resolvedMessage.replace(/\n/g, "<br>")}</div>`,
      customerId,
      jobId,
    });

    return NextResponse.json({
      success: result.success,
      mode: result.mode,
      communicationId: result.communicationId,
      error: result.error,
    });
  } catch (error) {
    console.error("Send communication error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
