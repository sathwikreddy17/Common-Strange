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
- Public media proxy endpoint: `GET /v1/media/<key>`
- **Production guard:** filesystem media fallback is blocked outside `DEBUG` unless explicitly overridden (see env vars below)

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
- **Hardening:** DRF scoped throttling (`events`) enabled + retention command (see “Housekeeping”)

### Search (Phase 1: Postgres FTS + trigram)
Blueprint-aligned (Blueprint §5).
- Real Postgres `tsvector` stored on `Article.search_tsv` with GIN index
- Tags included in the stored vector
- Ranking boosts:
  - base `ts_rank`
  - editor-pick weight
  - recency decay
  - optional trending boost
- Short TTL caching of search results (Redis-backed Django cache if available)
- Maintenance:
  - `backfill_search_tsv` command for backfill/repair

### SEO package
Blueprint-aligned (Blueprint §6).
- `robots.txt`
- `sitemap.xml`
- per-article canonical + JSON-LD (`Article`, `BreadcrumbList`)
- Google News sitemap endpoint (backend)

### Observability / safety
- `GET /v1/health/` readiness endpoint (DB + cache best-effort)
- Optional request timing logs when `REQUEST_LOGGING=1`

### Frontend
- Home page lists published articles + search
- Trending wired to backend editor-trending endpoint (403-safe)
- Taxonomy browse pages (categories/authors/series/tags)
- Article page renders markdown/html, widgets (`pull_quote`, `related_card`), tags

---

## Widgets schema (current)
Blueprint §3 calls for a controlled widget manifest.

Currently supported widget types:
- `pull_quote`: `{ type: "pull_quote", text: string, attribution?: string | null }`
- `related_card`: `{ type: "related_card", articleId: number }`

Not yet implemented (blueprint items):
- `youtube`
- `gallery`
- richer “video widget” metadata (Blueprint §8 “Video (important soon)”)

---

## Key endpoints

### Public API (read)
Base: `/v1/`
- `GET /health/`
- `GET /articles/` (supports `?status=published`, `?category=<slug>`, `?tag=<slug>`)
- `GET /articles/<slug>/` (published only unless `?preview_token=...`)
- `GET /search/?q=...`
- `GET /media/<key>`
- `POST /events/pageview/`
- `POST /events/read/`

### Editorial API (session auth)
Base: `/v1/editor/`
- Articles:
  - `GET /articles/`
  - `POST /articles/` (create draft)
  - `GET /articles/<id>/`
  - `PATCH /articles/<id>/`
  - `POST /articles/<id>/submit/`
  - `POST /articles/<id>/approve/`
  - `POST /articles/<id>/schedule/`
  - `POST /articles/<id>/publish_now/`
  - `POST /articles/<id>/preview_token/`
  - `POST /articles/<id>/generate_og/`
- Taxonomy:
  - `GET/POST/DELETE /categories/`, `/authors/`, `/series/`, `/tags/`
- Media:
  - `POST /media/upload/`
- Analytics:
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

## Housekeeping / cron
Blueprint §1 and §10 recommend using cron for scheduled jobs (instead of Celery Beat in production).

Suggested cron jobs (Render Cron or equivalent):
- Publish due posts:
  - `python manage.py publish_due_posts`
- Retention:
  - `python manage.py prune_events --days 90`
- Search maintenance (optional):
  - `python manage.py backfill_search_tsv --only-missing`

---

## Debugging notes
- Next.js server components fetching `/v1/...` need absolute URLs. See:
  - `infra/docs/debugging-nextjs-fetch-and-proxy.md`

---

## Next steps (planned / backlog)

### From `Final PoC Blueprint` (highest leverage for frontend next)
- **Curated homepage modules (Aeon-like)**: public + editor APIs to define slots/sections
- **Video widget (embeds + metadata)**: widget schema + rendering support

### Additional backend ergonomics (nice-to-have)
- Return absolute media URLs in API responses (`og_image_url`, `hero_media_urls`, etc.)
- `/v1/me/` session auth helper endpoint
