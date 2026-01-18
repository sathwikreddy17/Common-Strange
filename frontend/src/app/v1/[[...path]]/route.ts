import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const UPSTREAM = process.env.NEXT_PUBLIC_BACKEND_BASE ?? "http://backend:8000";

function buildUpstreamUrl(req: NextRequest, pathParts: string[]) {
  const upstream = new URL(UPSTREAM);
  const restPath = pathParts.join("/");
  upstream.pathname = `/v1/${restPath}`;
  upstream.search = req.nextUrl.search;
  return upstream;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const url = buildUpstreamUrl(req, path);

  const res = await fetch(url.toString(), {
    // keep simple; pass through caching headers from upstream
    method: "GET",
    headers: {
      accept: req.headers.get("accept") ?? "application/json",
    },
  });

  return new NextResponse(res.body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
      "cache-control": res.headers.get("cache-control") ?? "no-store",
    },
  });
}

export async function HEAD(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const url = buildUpstreamUrl(req, path);

  const res = await fetch(url.toString(), {
    method: "HEAD",
  });

  return new NextResponse(null, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
      "cache-control": res.headers.get("cache-control") ?? "no-store",
    },
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const url = buildUpstreamUrl(req, path);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "content-type": req.headers.get("content-type") ?? "application/json",
      accept: req.headers.get("accept") ?? "application/json",
    },
    body: await req.arrayBuffer(),
  });

  return new NextResponse(res.body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
      "cache-control": res.headers.get("cache-control") ?? "no-store",
    },
  });
}
