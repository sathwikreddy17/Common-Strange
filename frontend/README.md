# Common Strange frontend

Next.js (App Router) public site + minimal editor UI for Common Strange.

## Environment variables
Copy `./.env.local.example` → `./.env.local` if present, otherwise create `./.env.local`.

- `NEXT_PUBLIC_SITE_URL`: base URL for canonical URLs (e.g. `http://localhost:3000`)
- `NEXT_PUBLIC_BACKEND_BASE`: backend base used by the `/v1/*` proxy route.
  - In Docker compose dev this should be `http://backend:8000`.

> Note: the browser cannot resolve Docker service names like `backend`. To avoid CORS + hostname issues, the app uses a same-origin `/v1/*` proxy.

## Local dev
From repo root, the recommended path is:
- `make dev`

Or run just the frontend:
- `npm install`
- `npm run dev`

## Routes of note

### Public
- `/` list of published articles + search
- `/[slug]` article page (supports `?preview_token=...`)
- `/robots.txt`
- `/sitemap.xml`

Article widgets currently rendered:
- `pull_quote`
- `related_card` (sidebar)
- `youtube`
- `gallery` (loads media via `/v1/media-assets/<id>/`)

### Editor (minimal PoC UI)
- `/editor` dashboard
- `/editor/articles` create drafts + edit
- `/editor/media` upload + lookup + recent uploads picker (helps build gallery widgets)

## API proxy (important)
The frontend provides a same-origin proxy for the backend API:
- `src/app/v1/[[...path]]/route.ts`

This lets the browser call:
- `/v1/articles?status=published`
- `/v1/search?q=...`
- `/v1/media-assets/<id>/`

…and Next.js forwards those requests to `NEXT_PUBLIC_BACKEND_BASE` internally.

## Notes / lessons learned
- The root `middleware.ts` redirects reserved paths like `/admin` and `/login` to the Django backend.
- **Do not redirect `/_next/*`** in middleware. If those assets are redirected, the browser will fail to load JS/CSS.
- During `next build`, the backend may not be reachable; sitemap and other server-side fetches should handle that gracefully.
