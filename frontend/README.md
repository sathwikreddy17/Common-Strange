# Common Strange frontend

Next.js (App Router) public site for Common Strange.

## Environment variables
Copy `./.env.local.example` → `./.env.local`.

- `NEXT_PUBLIC_SITE_URL`: base URL for canonical/sitemap/robots (e.g. `http://localhost:3000`)
- `NEXT_PUBLIC_API_BASE`: backend API base (e.g. `http://backend:8000` in compose)
- `NEXT_PUBLIC_BACKEND_BASE`: backend base for middleware redirects (admin/login)

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

## Notes
- The root `middleware.ts` redirects reserved paths like `/admin` and `/login` to the Django backend.
- During `next build`, the backend may not be reachable; sitemap and home page handle this by returning minimal outputs.
