import { NextResponse } from "next/server";

/**
 * GET /api/extension/ping
 * Health check for the Chrome extension to verify CRM connectivity.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Fresh Path CRM is running",
    timestamp: new Date().toISOString(),
  });
}
