# Debugging: Next.js Article Page “fetch failed” / “rendering forever” in Docker

## Summary
We hit a class of issues where the **homepage worked** (lists + search), but **article detail pages** (`/[slug]`) showed:
- **Runtime TypeError: fetch failed** / `ECONNREFUSED`
- or the page sitting on **“Rendering…”** for a long time

Root cause: **differences between browser networking and server-side networking in Next.js App Router**, combined with Docker hostnames.

This doc records what happened, why, and the durable fixes.

---

## Symptoms and what they mean

### 1) `TypeError: fetch failed` + `ECONNREFUSED`
Observed in frontend logs:
- `TypeError: fetch failed`
- `code: 'ECONNREFUSED'`

Meaning:
- The request was being made **from the Next.js server runtime** (inside the `frontend` container), and it was trying to connect to a host/port that was not reachable from that context.

Common causes:
- Using `localhost:8000` from inside a container (inside Docker, `localhost` is the container itself).
- Using a missing/incorrect `NEXT_PUBLIC_SITE_URL` to build absolute URLs.

### 2) `TypeError: Failed to parse URL from /v1/articles/...` / `ERR_INVALID_URL`
Observed in frontend logs:
- `Failed to parse URL from /v1/articles/hello-world/`
- `code: 'ERR_INVALID_URL'`

Meaning:
- In the Next.js server runtime, **Node’s `fetch()` expects an absolute URL**, not a relative path.
- Browsers happily accept relative URLs (`/v1/...`), but server-side fetch often needs a full origin.

This can look like the page “hangs”/“renders forever” because the server render is repeatedly erroring while the browser waits.

---

## Why the homepage worked but article pages failed

- The homepage is a **client component** (`"use client"`) and calls `fetch('/v1/...')` in the browser.
- The article page in `/app/[slug]/page.tsx` is a **server component**. It runs on the server for initial render and also inside `generateMetadata()`.

So the same code can behave differently depending on where it executes.

---

## Durable strategy that works in Docker + local

### A) Use a same-origin `/v1/*` proxy route in Next.js
Implemented at:
- `frontend/src/app/v1/[[...path]]/route.ts`

This allows the browser to call:
- `http://localhost:3000/v1/...`

and the frontend container forwards internally to:
- `http://backend:8000/v1/...`

This avoids CORS and avoids exposing Docker service names (`backend`) to the browser.

### B) When fetching from a **server component**, build an absolute origin from request headers
Fix applied in:
- `frontend/src/app/[slug]/page.tsx`

We compute origin from:
- `x-forwarded-host` / `host`
- `x-forwarded-proto` (default `http`)

Then server-side fetch uses:
- `${origin}/v1/...`

Note: in the used Next.js version, `headers()` returns a Promise, so we must `await headers()`.

---

## Quick troubleshooting checklist

1) **Does `/v1/articles?status=published` work from the browser?**
   - If yes, proxy route is likely OK.

2) **Do frontend logs mention `ERR_INVALID_URL` with a relative path?**
   - Fix: server-side fetch must use absolute URL.

3) **Do frontend logs mention `ECONNREFUSED`?**
   - Fix: check hostnames. Inside Docker, use `backend:8000` for upstream, not `localhost:8000`.

4) **Is `NEXT_PUBLIC_SITE_URL` set?**
   - In Docker it’s optional if we rely on header-derived origin.
   - For canonical URLs you may still want it later.

---

## What we changed (implementation notes)

- `frontend/src/app/[slug]/page.tsx`
  - Compute origin via `headers()`
  - Use absolute fetch URLs for server runtime
  - Keep all requests going through `/v1/*` proxy for consistency

---

## References
- Next.js App Router: server components + `generateMetadata()` run on server.
- Docker networking:
  - `localhost` inside container != host machine
  - container-to-container uses service names (e.g., `backend`).
