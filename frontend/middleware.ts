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
  return res;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

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

  if (pathname.startsWith("/_next")) {
    return withDiag(NextResponse.redirect(new URL("/", BACKEND_BASE), 307));
  }

  if (RESERVED_EXACT.has(pathname)) {
    return withDiag(NextResponse.redirect(new URL("/", BACKEND_BASE), 307));
  }

  return NextResponse.next();
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
    "/_next/:path*",
  ],
};
