import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { logError } from "@/lib/logger";

type AuthResult = {
  session: { user: { id: string; tenantId: string } };
  tenantId: string;
};

export function withAuth(
  handler: (req: NextRequest, auth: AuthResult) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const requestId = req.headers.get("x-request-id") ?? undefined;
    try {
      const auth = await requireAuth();
      if ("error" in auth) return auth.error;
      return await handler(req, auth as AuthResult);
    } catch (error) {
      logError(error, {
        route: req.nextUrl.pathname,
        method: req.method,
        requestId,
      });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: requestId ? { "x-request-id": requestId } : {} }
      );
    }
  };
}
