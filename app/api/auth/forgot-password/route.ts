import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getDb } from "@/src/db";
import { eq } from "drizzle-orm";
import { users, businessSettings, passwordResets } from "@/src/db/schema";
import { sendEmailDirect } from "@/lib/services/email";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const { success } = rateLimit(`forgot-password:${ip}`, 3, 60_000);
    if (!success) return rateLimitResponse();

    const { email } = (await req.json()) as { email?: string };

    if (!email) {
      return NextResponse.json(
        { message: "If that email exists, a reset link has been sent." },
        { status: 200 }
      );
    }

    const db = getDb();
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1).then(r => r[0]);

    if (user) {
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.insert(passwordResets).values({
        userId: user.id,
        token,
        expiresAt: expiresAt.toISOString(),
      });

      const baseUrl =
        process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
      const resetLink = `${baseUrl}/login/reset-password?token=${token}`;

      // Try to send email via configured provider
      let settings: {
        emailProvider?: string | null;
        senderEmail?: string | null;
        emailFromName?: string | null;
        businessName?: string;
        googleEmail?: string | null;
      } = {};

      if (user.tenantId) {
        const bs = await db.select().from(businessSettings).where(eq(businessSettings.tenantId, user.tenantId)).limit(1).then(r => r[0]);
        if (bs) {
          settings = {
            emailProvider: bs.emailProvider,
            senderEmail: bs.senderEmail,
            emailFromName: bs.emailFromName,
            businessName: bs.businessName,
            googleEmail: bs.googleEmail,
          };
        }
      }

      const result = await sendEmailDirect(
        {
          to: email,
          subject: "Password Reset Request",
          html: `
            <h2>Password Reset</h2>
            <p>You requested a password reset. Click the link below to set a new password:</p>
            <p><a href="${resetLink}">Reset your password</a></p>
            <p>This link expires in 1 hour.</p>
            <p>If you didn't request this, you can safely ignore this email.</p>
          `,
          text: `Password Reset\n\nYou requested a password reset. Visit the following link to set a new password:\n\n${resetLink}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, you can safely ignore this email.`,
        },
        settings
      );

      if (result.mode === "dev") {
        console.log("[PASSWORD RESET - DEV MODE]");
        console.log(`  Email: ${email}`);
        console.log(`  Reset link: ${resetLink}`);
      }
    }

    // Always return the same response to avoid leaking whether the email exists
    return NextResponse.json(
      { message: "If that email exists, a reset link has been sent." },
      { status: 200 }
    );
  } catch (error) {
    console.error("[FORGOT PASSWORD ERROR]", error);
    return NextResponse.json(
      { message: "If that email exists, a reset link has been sent." },
      { status: 200 }
    );
  }
}
