import { NextResponse } from "next/server";
import { getDb } from "@/src/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const testUrl = process.env.TURSO_DATABASE_URL || "";
  let urlParseResult: string;
  try {
    const u = new URL(testUrl);
    urlParseResult = `OK: ${u.hostname}`;
  } catch (e) {
    urlParseResult = `FAIL: ${e instanceof Error ? e.message : String(e)} for "${testUrl}"`;
  }

  try {
    const db = getDb();
    const result = await db.all(sql`SELECT 1 as ok`);

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      runtime: "vercel-node",
      database: "turso",
      dbCheck: result ? "connected" : "failed",
      urlParseResult,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack?.split("\n").slice(0, 5) : undefined,
        urlParseResult,
        fullUrl: testUrl,
      },
      { status: 500 }
    );
  }
}
