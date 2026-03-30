import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/src/db";
import { eq } from "drizzle-orm";
import { users, passwordResets } from "@/src/db/schema";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = (await req.json()) as {
      token?: string;
      password?: string;
    };

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const db = getDb();
    const resetRecord = await db.select().from(passwordResets).where(eq(passwordResets.token, token)).limit(1).then(r => r[0]);

    if (!resetRecord) {
      return NextResponse.json(
        { error: "Invalid or expired reset link." },
        { status: 400 }
      );
    }

    if (resetRecord.usedAt) {
      return NextResponse.json(
        { error: "This reset link has already been used." },
        { status: 400 }
      );
    }

    if (new Date() > new Date(resetRecord.expiresAt)) {
      return NextResponse.json(
        { error: "This reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await Promise.all([
      db.update(users).set({ password: hashedPassword, updatedAt: new Date().toISOString() }).where(eq(users.id, resetRecord.userId)),
      db.update(passwordResets).set({ usedAt: new Date().toISOString() }).where(eq(passwordResets.id, resetRecord.id)),
    ]);

    return NextResponse.json(
      { message: "Password has been reset successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("[RESET PASSWORD ERROR]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
