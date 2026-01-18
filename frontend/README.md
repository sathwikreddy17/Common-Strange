# Common Strange frontend

Next.js (App Router) public site for Common Strange.

## Environment variables
Copy `./.env.local.example`  `./.env.local`.

- `NEXT_PUBLIC_SITE_URL`: base URL for canonical/sitemap/robots (e.g. `http://localhost:3000`)
- `NEXT_PUBLIC_BACKEND_BASE`: backend base used by server-side proxying and reserved-path redirects.
  - In Docker compose dev this should be `http://backend:8000`.

> Note: the browser cannot resolve Docker service names like `backend`. To avoid CORS + hostname issues, the app uses a same-origin `/v1/*` proxy.

## Local dev
From repo root, the recommended path is:
- `make dev`

Or run just the frontend:
- `npm install`
- `npm run dev`

## Routes of note
- `/` list of published articles
- `/[slug]` article page (supports `?preview_token=...`)
- `/robots.txt`
- `/sitemap.xml`

## API proxy (important)
The frontend provides a same-origin proxy for the backend API:
- `src/app/v1/[[...path]]/route.ts`

This lets the browser call:
- `/v1/articles?status=published`
- `/v1/search?q=...`

And Next.js forwards those requests to `NEXT_PUBLIC_BACKEND_BASE` internally.

## Notes / lessons learned
- The root `middleware.ts` redirects reserved paths like `/admin` and `/login` to the Django backend.
- **Do not redirect `/_next/*`** in middleware. If those assets are redirected, the browser will fail to load JS/CSS and the app will appear broken.
- During `next build`, the backend may not be reachable; sitemap and other server-side fetches should handle that gracefully.
