import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = [
  "/api/webhooks/",
  "/api/booking",
  "/api/pay/",
  "/api/portal",
  "/api/quotes/",   // public/ and public-accept/ sub-paths
  "/api/invoices/", // public/ sub-path
  "/api/health",
  "/api/auth/",
  "/login",
  "/register",
  "/book",
  "/quote/",
  "/invoice/",
  "/pay/",
  "/portal",
  "/_next",
  "/favicon.ico",
  "/icons",
  "/uploads",
  "/fonts",
  "/manifest.json",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

const SECURITY_HEADERS = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Auth check for protected routes
  if (!isPublicPath(pathname)) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  const response = NextResponse.next();

  // Apply security headers to every response
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|icons|uploads|fonts|manifest\\.json).*)",
  ],
};
