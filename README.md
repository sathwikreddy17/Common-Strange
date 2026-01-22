# Common Strange (PoC)

Production-shaped, local-first publishing platform.

## Source of truth: Final PoC Blueprint
All feature work and prioritization **must** be driven by `Final PoC Blueprint.txt` (and/or `Final PoC Blueprint.docx`).

When deciding the “next set of features”, always:
1) Read the relevant section(s) of `Final PoC Blueprint`.
2) Map the requested work to blueprint requirements.
3) Implement in blueprint order/priority unless explicitly overridden.
4) Update documentation/tests with references to the blueprint section(s) that motivated the change.

If something is implemented that is **not** in the blueprint, document it as an explicit deviation (with rationale).

---

## Monorepo structure
- `frontend/` Next.js (Vercel)
- `backend/` Django + DRF (Render)
- `infra/` deployment blueprints/runbooks
- `packages/` shared packages (currently placeholders for later extraction)

---

## Current status (implemented)

### Publishing spine (workflow)
- Mandatory review workflow: `DRAFT → IN_REVIEW → SCHEDULED → PUBLISHED → ARCHIVED`
- Preview tokens for draft review (`?preview_token=...`, 24h TTL)
- Revision snapshots via `ArticleVersion` on key transitions
- Scheduled publish command: `publish_due_posts` (cron-friendly)

### Media pipeline (S3-compatible, stateless)
Blueprint-aligned: MinIO locally / R2 in production shape.
- S3-compatible storage abstraction (`backend/content/storage.py`)
- Editor upload endpoint: `POST /v1/editor/media/upload/`
- Image variants generated as WebP (thumb/medium/large)
- Public media proxy endpoint: `GET /v1/media/<key>` (works for local filesystem fallback + S3)

### Social growth (publish-time OG images)
- OG PNG generated at publish time and stored in object storage (`og/<slug>.png`)
- Celery task: `generate_og_image_for_article(article_id)`
- Publish cron enqueues OG generation after publishing

### Events + trending foundation
- `Event` model for `pageview` and `read` events
- Public endpoints:
  - `POST /v1/events/pageview/`
  - `POST /v1/events/read/`
- Editorial endpoint:
  - `GET /v1/editor/trending/` (last-24h pageviews)

### Search (Phase 1 partial)
- Postgres FTS query includes tags in the vector
- `pg_trgm` enabled
- Trigram GIN indexes on `content_article.title` and `content_article.slug`

> Remaining for blueprint parity: migrate `Article.search_tsv` from TextField → real `tsvector` + GIN index, and implement ranking boosts.

### SEO package
- `robots.txt`
- `sitemap.xml`
- per-article canonical + JSON-LD (`Article`, `BreadcrumbList`)
- Google News sitemap endpoint (backend)

### Frontend
- Home page lists published articles + search
- Trending + Editor Picks (currently heuristic on the homepage UI)
- Taxonomy browse pages (categories/authors/series/tags)
- Article page renders markdown/html, widgets (`pull_quote`, `related_card`), tags

---

## Key endpoints

### Public API (read)
Base: `/v1/`
- `GET /articles/` (supports `?status=published`, `?category=<slug>`, `?tag=<slug>`)
- `GET /articles/<slug>/` (published only unless `?preview_token=...`)
- `GET /search/?q=...`
- `GET /media/<key>`
- `POST /events/pageview/`
- `POST /events/read/`

### Editorial API (session auth)
Base: `/v1/editor/`
- Workflow endpoints for drafts/review/schedule/publish
- `POST /media/upload/`
- `GET /trending/`

---

## Local dev (Docker)

### Prereqs
- Docker + Docker Compose

### Environment files
- `backend/.env.local` (Django/Celery/MinIO)
- `frontend/.env.local` (Next.js)

### Run
- `make dev`

Migrations:
- `make migrate`

Create admin user:
- `make createsuperuser`

Seed demo content:
- `docker compose run --rm backend python manage.py seed_demo_content`

---

## Debugging notes
- Next.js server components fetching `/v1/...` need absolute URLs. See:
  - `infra/docs/debugging-nextjs-fetch-and-proxy.md`

---

## Next steps (planned / backlog)

### Backend hardening (do next, in order)
1) **Events endpoint abuse protection**
   - Add DRF throttling for `POST /v1/events/pageview/` and `POST /v1/events/read/`
   - Validate payloads (max lengths; `read_ratio` 0..1)
2) **Event retention / pruning**
   - Add a management command (cron-friendly) to prune old `Event` rows (e.g. keep 60–90 days)
3) **Search robustness**
   - Ensure `search_tsv` is consistently materialized for published content (backfill job / periodic maintenance)
4) **Health/observability**
   - Add a minimal `GET /v1/health/` (DB + cache connectivity)
   - Improve request logging for key endpoints
5) **Production safety guards**
   - Ensure filesystem media fallback is disabled outside dev (enforce `MEDIA_USE_S3=1` semantics)

### From `Final PoC Blueprint` (remaining / ongoing)
- Better curated homepage modules (Aeon-like)
- Video widget (embeds + metadata)
