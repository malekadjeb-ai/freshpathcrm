import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getDb } from "@/src/db";
import { eq } from "drizzle-orm";
import { users } from "@/src/db/schema";
import { NextResponse } from "next/server";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const db = getDb();
        const user = await db.select().from(users).where(eq(users.email, credentials.email)).limit(1).then(r => r[0]);

        if (!user) {
          throw new Error("Invalid credentials");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as "ADMIN" | "OWNER" | "MANAGER" | "EMPLOYEE" | "USER",
          tenantId: user.tenantId ?? undefined,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const userMeta = user as { role?: string; tenantId?: string };
        token.role = userMeta.role;
        token.tenantId = userMeta.tenantId;
      }
      // Always refresh tenantId from DB in case it was set after login
      if (token.id && !token.tenantId) {
        const db = getDb();
        const dbUser = await db.select({ tenantId: users.tenantId, role: users.role }).from(users).where(eq(users.id, token.id as string)).limit(1).then(r => r[0]);
        if (dbUser?.tenantId) {
          token.tenantId = dbUser.tenantId;
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as typeof session.user.role;
        session.user.tenantId = token.tenantId as string | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

/**
 * Authenticate an API route and extract the tenantId.
 * Returns { session, tenantId } on success.
 * Returns { error: NextResponse } if not authenticated.
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  const tenantId = (session.user as { tenantId?: string }).tenantId;
  if (!tenantId) {
    return { error: NextResponse.json({ error: "No tenant" }, { status: 403 }) } as const;
  }
  return { session, tenantId } as const;
}
