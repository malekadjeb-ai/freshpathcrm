import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { eq, and, isNull, isNotNull, like } from "drizzle-orm";
import { customers } from "@/src/db/schema";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const body = await req.json();
    const { name, phone, email } = body;

    const duplicates: Array<{
      id: string;
      name: string;
      phone: string | null;
      email: string | null;
      matchType: string;
      confidence: number;
    }> = [];

    // Phone match (highest confidence) — strip formatting, match last 10 digits
    if (phone) {
      const digits = phone.replace(/\D/g, "").slice(-10);
      if (digits.length === 10) {
        const phoneMatches = await db
          .select({ id: customers.id, name: customers.name, phone: customers.phone, email: customers.email })
          .from(customers)
          .where(and(isNull(customers.deletedAt), isNotNull(customers.phone), eq(customers.tenantId, tenantId)));

        for (const c of phoneMatches) {
          const cDigits = c.phone?.replace(/\D/g, "").slice(-10);
          if (cDigits === digits) {
            duplicates.push({
              id: c.id,
              name: c.name,
              phone: c.phone,
              email: c.email,
              matchType: "phone",
              confidence: 0.95,
            });
          }
        }
      }
    }

    // Email match (high confidence)
    if (email) {
      const emailLower = email.toLowerCase().trim();
      const emailMatches = await db
        .select({ id: customers.id, name: customers.name, phone: customers.phone, email: customers.email })
        .from(customers)
        .where(and(isNull(customers.deletedAt), eq(customers.email, emailLower), eq(customers.tenantId, tenantId)));

      for (const c of emailMatches) {
        if (!duplicates.find((d) => d.id === c.id)) {
          duplicates.push({
            id: c.id,
            name: c.name,
            phone: c.phone,
            email: c.email,
            matchType: "email",
            confidence: 0.9,
          });
        }
      }
    }

    // Name fuzzy match (lower confidence)
    if (name) {
      const nameLower = name.toLowerCase().trim();
      const nameMatches = await db
        .select({
          id: customers.id,
          name: customers.name,
          phone: customers.phone,
          email: customers.email,
          address: customers.address,
        })
        .from(customers)
        .where(and(isNull(customers.deletedAt), like(customers.name, `%${nameLower}%`), eq(customers.tenantId, tenantId)))
        .limit(10);

      for (const c of nameMatches) {
        if (!duplicates.find((d) => d.id === c.id)) {
          const similarity = calculateNameSimilarity(nameLower, c.name.toLowerCase());
          if (similarity > 0.7) {
            duplicates.push({
              id: c.id,
              name: c.name,
              phone: c.phone,
              email: c.email,
              matchType: "name",
              confidence: similarity * 0.8,
            });
          }
        }
      }
    }

    // Sort by confidence
    duplicates.sort((a, b) => b.confidence - a.confidence);

    return NextResponse.json({
      hasDuplicates: duplicates.length > 0,
      duplicates: duplicates.slice(0, 5),
    });
  } catch (error) {
    console.error("Check duplicate error:", error);
    return NextResponse.json({ error: "Failed to check duplicates" }, { status: 500 });
  }
}

function calculateNameSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const aWords = a.split(/\s+/);
  const bWords = b.split(/\s+/);
  let matches = 0;
  for (const w of aWords) {
    if (bWords.some((bw) => bw === w || levenshtein(w, bw) <= 1)) {
      matches++;
    }
  }
  return matches / Math.max(aWords.length, bWords.length);
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}
