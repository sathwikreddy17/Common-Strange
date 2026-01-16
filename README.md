# Common Strange (PoC)

Production-shaped, local-first publishing platform.

## Monorepo structure
- `frontend/` Next.js (Vercel)
- `backend/` Django + DRF (Render)
- `infra/` deployment blueprints/runbooks
- `packages/` shared packages (currently placeholders for later extraction)

## Current status (implemented)
### Publishing spine (PoC1)
- **Workflow**: Draft → In Review → Scheduled → Published
- **Preview tokens**: fetch drafts via `?preview_token=...` (24h TTL)
- **Revision snapshots**: `ArticleVersion` snapshots created on key transitions
- **Scheduled publish**: cron-compatible management command `publish_due_posts`

### Public API (Django/DRF)
Base: `/v1/`
- `GET /articles/` (supports `?status=published`, `?category=<slug>`)
- `GET /articles/<slug>/` (published only unless `?preview_token=...`)
- `GET /categories/`
- `GET /categories/<slug>/articles/`
- `GET /series/<slug>/`
- `GET /authors/<slug>/`

### Editorial API (session auth)
Base: `/v1/editor/`
- `POST /articles/` create draft
- `PATCH /articles/<id>/` update
- `POST /articles/<id>/submit/`
- `POST /articles/<id>/approve/`
- `POST /articles/<id>/schedule/` body: `{ "publish_at": "ISO8601" }`
- `POST /articles/<id>/publish_now/`
- `GET /articles/<id>/preview_token/`

### Frontend (Next.js)
- Home page lists **published** articles.
- Article page supports **preview tokens**.
- Widgets implemented (PoC1): `pull_quote`, `related_card`.
- SEO basics implemented:
  - `robots.txt` via `src/app/robots.ts`
  - `sitemap.xml` via `src/app/sitemap.ts`
  - per-article canonical + JSON-LD (`Article`, `BreadcrumbList`)

## Local dev
### Prereqs
- Docker + Docker Compose

### Environment files
Copy the example env files and adjust as needed:
- `backend/.env.local.example` → `backend/.env.local`
- `frontend/.env.local.example` → `frontend/.env.local`

### Run
Use the root `Makefile`:
- `make dev`
- `make migrate`
- `make createsuperuser`

> Note: `next build` runs without the backend reachable (CI-friendly). When running locally via compose, the frontend uses `http://backend:8000` by default.

## Next steps (planned)
- Add category/author/series hub pages in Next.js.
- Make public `GET /v1/articles/` default to published-only (safer public API).
- Expand sitemap to include category/author/series URLs.
- Add demo seed command and basic fixtures.
