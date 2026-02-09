import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_BASE ?? "http://localhost:8000";

const RESERVED_EXACT = new Set([
  "/admin",
  "/api",
  "/static",
  "/media",
  "/assets",
  "/dashboard",
  "/robots.txt",
  "/sitemap.xml",
  "/favicon.ico",
]);

// Public auth routes handled by frontend
const PUBLIC_AUTH_ROUTES = new Set([
  "/login",
  "/signup",
  "/logout",
  "/account",
]);

function withDiag(res: NextResponse) {
  res.headers.set("x-cs-mw", "1");
  // Content Security Policy
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' " + BACKEND_BASE,
      "frame-ancestors 'none'",
    ].join("; ")
  );
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return res;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // IMPORTANT: never redirect Next.js internal assets.
  if (pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  // Let frontend handle public auth routes
  if (PUBLIC_AUTH_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  if (pathname === "/admin") {
    return withDiag(NextResponse.redirect(new URL("/admin/", BACKEND_BASE), 307));
  }

  if (pathname === "/api") {
    return withDiag(NextResponse.redirect(new URL("/", BACKEND_BASE), 307));
  }

  if (RESERVED_EXACT.has(pathname)) {
    return withDiag(NextResponse.redirect(new URL("/", BACKEND_BASE), 307));
  }

  // Add security headers to all other responses
  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return res;
}

export const config = {
  matcher: [
    "/admin",
    "/api",
    "/static/:path*",
    "/media/:path*",
    "/assets/:path*",
    "/dashboard",
    "/login",
    "/logout",
    "/robots.txt",
    "/sitemap.xml",
    "/favicon.ico",
    // NOTE: do NOT include /_next here.
  ],
};
