# Common Strange (PoC)

Production-shaped, local-first publishing platform.

## Monorepo structure
- `frontend/` Next.js (Vercel)
- `backend/` Django + DRF (Render)
- `infra/` deployment blueprints/runbooks
- `packages/` shared packages (currently placeholders for later extraction)

## Current status (implemented)

### Publishing spine (PoC1)
- **Workflow**: Draft  In Review  Scheduled  Published
- **Preview tokens**: fetch drafts via `?preview_token=...` (24h TTL)
- **Revision snapshots**: `ArticleVersion` snapshots created on key transitions
- **Scheduled publish**: cron-compatible management command `publish_due_posts`

### Public API (Django/DRF)
Base: `/v1/`

- Articles:
  - `GET /articles/` (supports `?status=published`, `?category=<slug>`, `?tag=<slug>`)
  - `GET /articles/<slug>/` (published only unless `?preview_token=...`)
  - `GET /search/?q=...` (published only)

- Categories:
  - `GET /categories/`
  - `GET /categories/<slug>/articles/`

- Authors:
  - `GET /authors/`
  - `GET /authors/<slug>/`
  - `GET /authors/<slug>/articles/`

- Series:
  - `GET /series/`
  - `GET /series/<slug>/`
  - `GET /series/<slug>/articles/`

- Tags:
  - `GET /tags/`
  - `GET /tags/<slug>/articles/`

### Editorial API (session auth)
Base: `/v1/editor/`

- Articles:
  - `POST /articles/` create draft
  - `PATCH /articles/<id>/` update
  - `POST /articles/<id>/submit/`
  - `POST /articles/<id>/approve/`
  - `POST /articles/<id>/schedule/` body: `{ "publish_at": "ISO8601" }`
  - `POST /articles/<id>/publish_now/`
  - `GET /articles/<id>/preview_token/`

- Taxonomy (Editor-only):
  - `GET|POST /categories/`
  - `GET|PATCH|DELETE /categories/<slug>/`
  - `GET|POST /authors/`
  - `GET|PATCH|DELETE /authors/<slug>/`
  - `GET|POST /series/`
  - `GET|PATCH|DELETE /series/<slug>/`
  - `GET|POST /tags/`
  - `GET|PATCH|DELETE /tags/<slug>/`

### Frontend (Next.js)
- Home page lists **published** articles.
- Search bar uses `/v1/search?q=...`.
- Home page includes basic **Trending** + **Editor Picks** sections (PoC heuristics).
- Browsing pages:
  - `/categories` + `/categories/[slug]`
  - `/authors` + `/authors/[slug]`
  - `/series` + `/series/[slug]`
  - `/tags` + `/tags/[slug]`
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
- `backend/.env.local.example`  `backend/.env.local`
- `frontend/.env.local.example`  `frontend/.env.local`

### Run
Use the root `Makefile`:
- `make dev`
- `make migrate`
- `make createsuperuser`

Seed demo content (optional):
- `docker compose run --rm backend python manage.py seed_demo_content`

## Lessons learned (debugging)

### 1) CORS settings require the package in the container
If `corsheaders` is enabled in `INSTALLED_APPS` but `django-cors-headers` is not installed in the image, Django will crash at startup with:
`ModuleNotFoundError: No module named 'corsheaders'`.

Fix: ensure `django-cors-headers` is listed in `backend/requirements.txt` and rebuild the backend image.

### 2) Do not redirect Next.js internal assets (`/_next/*`)
Redirecting `/_next/*` to the backend breaks the frontend (browser cannot load JS/CSS) and you will see errors like:
- `Failed to load resource: A server with the specified hostname could not be found` (e.g. `http://backend:8000/...`)

Fix: `frontend/src/middleware.ts` must **not** match or redirect `/_next/*`.

### 3) Compose networking: browser vs container hostnames
Inside Docker, services can reach each other via `http://backend:8000`, but the **host browser cannot resolve** `backend`.

Fix: the frontend now provides a **same-origin proxy** route:
- `frontend/src/app/v1/[[...path]]/route.ts`

The browser calls `http://localhost:3000/v1/...` and Next forwards to the backend service internally.

## Next steps (planned)
- Richer public discovery (editor picks, events, trending)
- Media/OG image pipeline
- Video widget
- Google News sitemap
