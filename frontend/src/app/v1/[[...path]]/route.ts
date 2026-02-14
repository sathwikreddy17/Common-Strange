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

function forwardHeaders(req: NextRequest): HeadersInit {
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
    headers: forwardHeaders(req),
  });

  return buildResponse(res);
}

export async function HEAD(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const url = buildUpstreamUrl(req, path);

  const res = await fetch(url.toString(), {
    method: "HEAD",
    headers: forwardHeaders(req),
  });

  return buildResponse(res);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const url = buildUpstreamUrl(req, path);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: forwardHeaders(req),
    body: await req.arrayBuffer(),
  });

  return buildResponse(res);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const url = buildUpstreamUrl(req, path);

  const res = await fetch(url.toString(), {
    method: "PUT",
    headers: forwardHeaders(req),
    body: await req.arrayBuffer(),
  });

  return buildResponse(res);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const url = buildUpstreamUrl(req, path);

  const res = await fetch(url.toString(), {
    method: "PATCH",
    headers: forwardHeaders(req),
    body: await req.arrayBuffer(),
  });

  return buildResponse(res);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const url = buildUpstreamUrl(req, path);

  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers: forwardHeaders(req),
  });

  return buildResponse(res);
}
