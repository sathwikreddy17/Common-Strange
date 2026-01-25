# Debugging: Next.js Article Page “fetch failed” / “rendering forever” in Docker

## Summary
We hit a class of issues where the **homepage worked** (lists + search), but **article detail pages** (`/[slug]`) showed:
- Runtime `TypeError: fetch failed` / `ECONNREFUSED`
- or the page sitting on “Rendering…” for a long time

Root cause: **differences between browser networking and server-side networking in Next.js App Router**, combined with Docker hostnames.

This doc records what happened, why, and the durable fixes.

---

## Durable strategy that works in Docker + local

### A) Use a same-origin `/v1/*` proxy route in Next.js
Implemented at:
- `frontend/src/app/v1/[[...path]]/route.ts`

This allows the browser to call:
- `http://localhost:3000/v1/...`

…and Next.js forwards internally to:
- `NEXT_PUBLIC_BACKEND_BASE` (e.g. `http://backend:8000`)

This avoids CORS and avoids exposing Docker service names (`backend`) to the browser.

### B) When fetching from a **server component**, build an absolute origin from request headers
Fix applied in:
- `frontend/src/app/[slug]/page.tsx`

We compute origin from:
- `x-forwarded-host` / `host`
- `x-forwarded-proto` (default `http`)

Then server-side fetch uses:
- `${origin}/v1/...`

This pattern is also used for widget-driven requests that must run on the server (e.g. loading gallery media via `/v1/media-assets/<id>/`).

---

## Quick troubleshooting checklist

1) Does `/v1/articles?status=published` work from the browser?
   - If yes, proxy route is likely OK.

2) Do frontend logs mention `ERR_INVALID_URL` with a relative path?
   - Fix: server-side fetch must use an absolute URL.

3) Do frontend logs mention `ECONNREFUSED`?
   - Fix: check hostnames. Inside Docker, use `backend:8000` for upstream, not `localhost:8000`.

4) Is `NEXT_PUBLIC_BACKEND_BASE` set?
   - Required for the `/v1/*` proxy behavior.

---

## References
- Next.js App Router: server components + `generateMetadata()` run on server.
- Docker networking:
  - `localhost` inside container != host machine
  - container-to-container uses service names (e.g., `backend`).
