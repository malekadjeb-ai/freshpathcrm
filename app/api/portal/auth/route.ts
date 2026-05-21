import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/src/db";
import { customers, portalSessions } from "@/src/db/schema";
import { eq, and, lt, gte, isNull, isNotNull, desc } from "drizzle-orm";
import { sendSMSDirect } from "@/lib/services/sms";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import crypto from "crypto";

// Per-customer OTP verify attempt counter. In-memory: documented tech debt —
// scale-out across isolates requires Upstash (UPSTASH_REDIS_REST_*).
const otpAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_OTP_ATTEMPTS = 5;
const OTP_LOCKOUT_MS = 15 * 60 * 1000;

function checkOtpAttempts(customerId: string): boolean {
  const now = Date.now();
  const record = otpAttempts.get(customerId);
  if (!record || now > record.resetAt) return true;
  return record.count < MAX_OTP_ATTEMPTS;
}

function recordFailedOtpAttempt(customerId: string) {
  const now = Date.now();
  const record = otpAttempts.get(customerId);
  if (!record || now > record.resetAt) {
    otpAttempts.set(customerId, { count: 1, resetAt: now + OTP_LOCKOUT_MS });
  } else {
    record.count++;
  }
}

function clearOtpAttempts(customerId: string) {
  otpAttempts.delete(customerId);
}

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
    const body = await req.json();
    const { phone, action } = body;

    const db = getDb();

    if (action === "request-otp") {
      if (!phone) return NextResponse.json({ error: "Phone required" }, { status: 400 });

      const digits = phone.replace(/\D/g, "").slice(-10);
      if (digits.length !== 10) {
        return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
      }

      const phoneKey = `portal-otp-phone:${digits}`;
      const ipKey = `portal-otp-ip:${ip}`;
      const phoneLimit = rateLimit(phoneKey, 3, 10 * 60 * 1000);
      const ipLimit = rateLimit(ipKey, 10, 10 * 60 * 1000);
      if (!phoneLimit.success || !ipLimit.success) return rateLimitResponse();

      const allCustomers = await db
        .select({ id: customers.id, phone: customers.phone, name: customers.name })
        .from(customers)
        .where(and(isNotNull(customers.phone), isNull(customers.deletedAt)));

      const customer = allCustomers.find((c) => {
        const cDigits = c.phone?.replace(/\D/g, "").slice(-10);
        return cDigits === digits;
      });

      // Always reply with the same shape so the client can't enumerate accounts.
      // For unknown phones we return a random customerId that will fail verify.
      const genericResponse = (customerId: string, devOtp?: string) =>
        NextResponse.json({
          success: true,
          message: "If an account exists for this number, a code was sent.",
          customerId,
          ...(devOtp && { devOtp }),
        });

      if (!customer) {
        return genericResponse(crypto.randomUUID());
      }

      const otpCode = String(crypto.randomInt(100000, 1000000));
      const token = crypto.randomBytes(32).toString("hex");

      await db
        .delete(portalSessions)
        .where(
          and(
            eq(portalSessions.customerId, customer.id),
            lt(portalSessions.expiresAt, new Date().toISOString()),
          ),
        );

      await db.insert(portalSessions).values({
        customerId: customer.id,
        token,
        otpCode: hashOtp(otpCode),
        otpExpiry: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      if (process.env.TWILIO_ACCOUNT_SID) {
        await sendSMSDirect({
          to: customer.phone!,
          body: `Your Fresh Path verification code is: ${otpCode}. Expires in 10 minutes.`,
        });
      }

      const isDev = process.env.NODE_ENV === "development";
      return genericResponse(customer.id, isDev ? otpCode : undefined);
    }

    if (action === "verify-otp") {
      const { customerId, otp } = body;
      if (!customerId || !otp) {
        return NextResponse.json({ error: "customerId and otp required" }, { status: 400 });
      }

      if (!checkOtpAttempts(customerId)) {
        return NextResponse.json(
          { error: "Too many failed attempts. Try again in 15 minutes." },
          { status: 429 },
        );
      }

      const session = await db
        .select()
        .from(portalSessions)
        .where(
          and(
            eq(portalSessions.customerId, customerId),
            eq(portalSessions.otpCode, hashOtp(String(otp))),
            gte(portalSessions.otpExpiry, new Date().toISOString()),
          ),
        )
        .orderBy(desc(portalSessions.createdAt))
        .limit(1)
        .then((r) => r[0]);

      if (!session) {
        recordFailedOtpAttempt(customerId);
        return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
      }

      clearOtpAttempts(customerId);

      await db
        .update(portalSessions)
        .set({ otpCode: null, otpExpiry: null, lastActive: new Date().toISOString() })
        .where(eq(portalSessions.id, session.id));

      const response = NextResponse.json({ success: true, token: session.token });

      response.cookies.set("portal-session", session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
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
