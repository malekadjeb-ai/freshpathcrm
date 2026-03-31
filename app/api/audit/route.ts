import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { auditLogs } from "@/src/db/schema";
import { eq, and, gte, lte, desc, count } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { tenantId } = auth;

    const db = getDb();
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const entity = searchParams.get("entity");
    const userId = searchParams.get("userId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const conditions = [eq(auditLogs.tenantId, tenantId)];
    if (entity) conditions.push(eq(auditLogs.entity, entity));
    if (userId) conditions.push(eq(auditLogs.userId, userId));
    if (dateFrom) conditions.push(gte(auditLogs.createdAt, dateFrom));
    if (dateTo) conditions.push(lte(auditLogs.createdAt, dateTo));

    const where = and(...conditions);

    const [logs, totalResult] = await Promise.all([
      db
        .select()
        .from(auditLogs)
        .where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      db
        .select({ count: count() })
        .from(auditLogs)
        .where(where),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return NextResponse.json({
      logs: logs.map((log) => ({
        ...log,
        changes: log.changes ? JSON.parse(log.changes) : null,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Audit log fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
