import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { referrals, customers } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();

    // Get all referrals with referrer info
    const rows = await db
      .select({
        referral: referrals,
        referrer: { id: customers.id, name: customers.name, phone: customers.phone },
      })
      .from(referrals)
      .leftJoin(customers, and(eq(referrals.referrerId, customers.id), eq(customers.tenantId, tenantId)));

    // Aggregate by referrer
    const leaderboard = new Map<
      string,
      { referrer: { id: string; name: string; phone: string | null }; count: number; booked: number; rewarded: number }
    >();

    for (const r of rows) {
      const referrer = r.referrer;
      if (!referrer?.id) continue;

      const existing = leaderboard.get(r.referral.referrerId);
      if (existing) {
        existing.count++;
        if (r.referral.status === "booked" || r.referral.status === "rewarded") existing.booked++;
        if (r.referral.status === "rewarded") existing.rewarded++;
      } else {
        leaderboard.set(r.referral.referrerId, {
          referrer,
          count: 1,
          booked: r.referral.status === "booked" || r.referral.status === "rewarded" ? 1 : 0,
          rewarded: r.referral.status === "rewarded" ? 1 : 0,
        });
      }
    }

    const sorted = Array.from(leaderboard.values()).sort((a, b) => b.count - a.count);

    return NextResponse.json({
      data: sorted,
      meta: { totalReferrals: rows.length, totalReferrers: sorted.length },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
