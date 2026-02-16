import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const UPSTREAM = process.env.BACKEND_INTERNAL_URL ?? process.env.NEXT_PUBLIC_BACKEND_BASE ?? "http://backend:8000";

function buildUpstreamUrl(req: NextRequest, pathParts: string[]) {
  const upstream = new URL(UPSTREAM);
  const restPath = pathParts.join("/");
  // Django requires trailing slashes
  upstream.pathname = `/v1/${restPath}${restPath && !restPath.endsWith('/') ? '/' : ''}`;
  upstream.search = req.nextUrl.search;
  return upstream;
}

function forwardHeaders(req: NextRequest, upstreamUrl: URL): HeadersInit {
  const headers: HeadersInit = {
    accept: req.headers.get("accept") ?? "application/json",
  };

  // Forward cookies for session auth
  const cookie = req.headers.get("cookie");
  if (cookie) {
    headers["cookie"] = cookie;
  }

  // Forward CSRF token
  const csrfToken = req.headers.get("x-csrftoken");
  if (csrfToken) {
    headers["x-csrftoken"] = csrfToken;
  }

  // Forward content-type for POST/PUT/PATCH
  const contentType = req.headers.get("content-type");
  if (contentType) {
    headers["content-type"] = contentType;
  }

  // Django's CSRF middleware requires a Referer header on HTTPS requests.
  // The browser sends Referer to *this* proxy, but server-side fetch() to
  // Django strips it.  Re-attach the original Referer/Origin so Django can
  // match them against CSRF_TRUSTED_ORIGINS.  If the browser didn't send
  // one (e.g. Referrer-Policy: no-referrer), synthesise it from the
  // incoming request URL so "no Referer" errors never reach the user.
  const referer = req.headers.get("referer");
  if (referer) {
    headers["referer"] = referer;
  } else {
    // Fallback: use the upstream URL itself so Django sees *something*
    headers["referer"] = upstreamUrl.origin + "/";
  }

  const origin = req.headers.get("origin");
  if (origin) {
    headers["origin"] = origin;
  }

  return headers;
}

function buildResponse(res: Response): NextResponse {
  const response = new NextResponse(res.body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
      "cache-control": res.headers.get("cache-control") ?? "no-store",
    },
  });

  // Forward Set-Cookie headers for session
  const setCookies = res.headers.getSetCookie?.() ?? [];
  for (const cookie of setCookies) {
    response.headers.append("set-cookie", cookie);
  }

  return response;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const url = buildUpstreamUrl(req, path);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: forwardHeaders(req, url),
  });

  return buildResponse(res);
}

export async function HEAD(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const url = buildUpstreamUrl(req, path);

  const res = await fetch(url.toString(), {
    method: "HEAD",
    headers: forwardHeaders(req, url),
  });

  return buildResponse(res);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const url = buildUpstreamUrl(req, path);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: forwardHeaders(req, url),
    body: await req.arrayBuffer(),
  });

  return buildResponse(res);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const url = buildUpstreamUrl(req, path);

  const res = await fetch(url.toString(), {
    method: "PUT",
    headers: forwardHeaders(req, url),
    body: await req.arrayBuffer(),
  });

  return buildResponse(res);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const url = buildUpstreamUrl(req, path);

  const res = await fetch(url.toString(), {
    method: "PATCH",
    headers: forwardHeaders(req, url),
    body: await req.arrayBuffer(),
  });

  return buildResponse(res);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const url = buildUpstreamUrl(req, path);

  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers: forwardHeaders(req, url),
  });

  return buildResponse(res);
}
