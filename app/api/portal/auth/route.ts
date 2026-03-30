import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/src/db";
import { customers, portalSessions } from "@/src/db/schema";
import { eq, and, lt, gte, isNotNull, desc } from "drizzle-orm";
import { sendSMSDirect } from "@/lib/services/sms";
import crypto from "crypto";

// Request OTP
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, action } = body;

    const db = getDb();

    if (action === "request-otp") {
      if (!phone) return NextResponse.json({ error: "Phone required" }, { status: 400 });

      const digits = phone.replace(/\D/g, "").slice(-10);
      if (digits.length !== 10) {
        return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
      }

      // Find customer by phone
      const allCustomers = await db.select({ id: customers.id, phone: customers.phone, name: customers.name })
        .from(customers)
        .where(and(isNotNull(customers.phone), eq(customers.deletedAt, null as unknown as string)));

      const customer = allCustomers.find((c) => {
        const cDigits = c.phone?.replace(/\D/g, "").slice(-10);
        return cDigits === digits;
      });

      if (!customer) {
        return NextResponse.json({ error: "No account found with this phone number" }, { status: 404 });
      }

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const token = crypto.randomBytes(32).toString("hex");

      // Clean up old sessions
      await db.delete(portalSessions).where(
        and(
          eq(portalSessions.customerId, customer.id),
          lt(portalSessions.expiresAt, new Date().toISOString())
        )
      );

      // Create session with OTP
      await db.insert(portalSessions).values({
        customerId: customer.id,
        token,
        otpCode,
        otpExpiry: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      // Send OTP via SMS if Twilio is configured
      if (process.env.TWILIO_ACCOUNT_SID) {
        await sendSMSDirect(
          { to: customer.phone!, body: `Your Fresh Path verification code is: ${otpCode}` }
        );
      }

      const isDev = process.env.NODE_ENV === "development";

      return NextResponse.json({
        success: true,
        message: "OTP sent to your phone",
        ...(isDev && { devOtp: otpCode }),
        customerId: customer.id,
      });
    }

    if (action === "verify-otp") {
      const { customerId, otp } = body;
      if (!customerId || !otp) {
        return NextResponse.json({ error: "customerId and otp required" }, { status: 400 });
      }

      const session = await db.select().from(portalSessions).where(
        and(
          eq(portalSessions.customerId, customerId),
          eq(portalSessions.otpCode, otp),
          gte(portalSessions.otpExpiry, new Date().toISOString())
        )
      ).orderBy(desc(portalSessions.createdAt)).limit(1).then(r => r[0]);

      if (!session) {
        return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
      }

      // Clear OTP and activate session
      await db.update(portalSessions).set({
        otpCode: null,
        otpExpiry: null,
        lastActive: new Date().toISOString(),
      }).where(eq(portalSessions.id, session.id));

      const response = NextResponse.json({
        success: true,
        token: session.token,
      });

      response.cookies.set("portal-session", session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });

      return response;
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Portal auth error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
