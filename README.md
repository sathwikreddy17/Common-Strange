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

## Blueprint status tracker (PoC)
This is the canonical “PoC progress” view. Status here is measured strictly against `Final PoC Blueprint`.

### 1) Target Architecture
- **Done**: Monorepo split `frontend/` (Next.js) + `backend/` (Django/DRF) + `infra/`.
- **Done**: Public experience implemented with Next.js App Router; article pages are cacheable with Next fetch revalidation.
- **In progress**: Home uses basic listing/trending; **curated modules (Aeon-like)** are not implemented yet.
- **In progress**: Category/Series/Author hubs exist, but **curated modules** are not implemented yet.

### 3) Content Model (PoC Schema)
- **Done**: Core taxonomy + articles + tags + media assets.
- **Done**: `widgets_json` controlled schema (backend validation + frontend rendering).
- **Done**: Status/state fields + publish timestamps.
- **Done**: `events` table for pageview/read.
- **Done**: Search `tsvector` + GIN index.
- **In progress**: `editor_picks` exists as a concept/backlog; not yet a full curated-slot system.

### 4) Workflow & Governance (Mandatory Review)
- **Done**: Mandatory review workflow: `DRAFT → IN_REVIEW → SCHEDULED → PUBLISHED → ARCHIVED`.
- **Done**: Scheduled publish command (`publish_due_posts`) suitable for cron.
- **Done**: Preview tokens for draft review.
- **Done**: Revision snapshots (`ArticleVersion`) on key transitions.

### 5) Search (Core Feature)
- **Done**: Postgres FTS (stored `search_tsv`) + GIN index + tag inclusion.
- **Missing**: Trigram indexes/typo-tolerance tuning beyond basics (optional enhancement).
- **Missing**: Ranking boosts (editor pick weight/recency decay/trending score) not fully implemented yet.

### 6) SEO Package
- **Done**: `sitemap.xml` (articles + taxonomy) and `robots.txt`.
- **Done**: Canonicals.
- **Done**: JSON-LD `Article` + `BreadcrumbList`.
- **Missing**: Google News sitemap (optional).

### 7) Social Growth Engine (Dynamic OG Images)
- **Done**: Publish-time OG image generation stored in object storage.
- **In progress**: CDN hostname/origin wiring depends on deployment env (local/dev/prod).

### 8) Media Pipeline (Stateless, S3-compatible)
- **Done**: Public media proxy: `GET /v1/media/<key>`.
- **Done**: Public media metadata: `GET /v1/media-assets/<id>/` (includes `*_url` fields).
- **Done**: Editor upload endpoint: `POST /v1/editor/media/upload/`.
- **Done**: Editor recent uploads: `GET /v1/editor/media/recent/?limit=...`.
- **Done**: Image variants (thumb/medium/large) produced.
- **Missing**: Video metadata model/storage beyond embeds (YouTube widget covers embed only).

### Widgets (Blueprint examples)
- **Done**: `pull_quote`
- **Done**: `related_card`
- **Done**: `youtube`
- **Done**: `gallery`

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
- Editor recent endpoint: `GET /v1/editor/media/recent/?limit=24`
- Image variants generated as WebP (thumb/medium/large)
- Public media proxy endpoint: `GET /v1/media/<key>`
- Public media-asset metadata endpoint: `GET /v1/media-assets/<id>/`
- MediaAsset API now returns **ready-to-use URLs** (when available):
  - `thumb_url`, `medium_url`, `large_url`, `original_url`

### Social growth (publish-time OG images)
- OG PNG generated at publish time and stored in object storage (`og/<slug>.png`)

### Events + trending foundation
- `Event` model for `pageview` and `read` events
- Public endpoints:
  - `POST /v1/events/pageview/`
  - `POST /v1/events/read/`
- Editorial endpoint:
  - `GET /v1/editor/trending/` (last-24h pageviews)

### Search (Phase 1: Postgres FTS + trigram)
Blueprint-aligned (Blueprint §5).
- Real Postgres `tsvector` stored on `Article.search_tsv` with GIN index
- Tags included in the stored vector

### SEO package
Blueprint-aligned (Blueprint §6).
- `robots.txt`
- `sitemap.xml`
- per-article canonical + JSON-LD (`Article`, `BreadcrumbList`)

### Frontend
Public site:
- Home page lists published articles + search
- Trending wired to backend editor-trending endpoint (403-safe)
- Taxonomy browse pages (categories/authors/series/tags)
- Article page renders markdown/html plus widgets:
  - `pull_quote`
  - `related_card` (sidebar)
  - `youtube`
  - `gallery` (renders real media via `media-assets/<id>`)

Editor UI (minimal PoC):
- `/editor` dashboard + links
- `/editor/articles/...` draft editing + workflow
- `/editor/media` upload + lookup + recent uploads picker

---

## Widgets schema (current)
Blueprint §3 calls for a controlled widget manifest.

Supported widget types (validated by backend, rendered by frontend):
- `pull_quote`: `{ type: "pull_quote", text: string, attribution?: string | null }`
- `related_card`: `{ type: "related_card", articleId: number }`
- `youtube`: `{ type: "youtube", videoId: string, title?: string | null, caption?: string | null }`
- `gallery`: `{ type: "gallery", mediaIds: number[], title?: string | null, caption?: string | null }`

---

## Key endpoints

### Public API (read)
Base: `/v1/`
- `GET /health/`
- `GET /articles/` (supports `?status=published`)
- `GET /articles/<slug>/` (published only unless `?preview_token=...`)
- `GET /search/?q=...`
- `GET /media/<key>`
- `GET /media-assets/<id>/`
- `POST /events/pageview/`
- `POST /events/read/`

### Editorial API (session auth)
Base: `/v1/editor/`
- Articles: create/edit + workflow transitions + preview tokens
- Taxonomy: categories/authors/series/tags
- Media:
  - `POST /media/upload/`
  - `GET /media/recent/?limit=...`
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

## Debugging notes
- Next.js server components fetching `/v1/...` need absolute URLs unless using the same-origin proxy.
  See: `infra/docs/debugging-nextjs-fetch-and-proxy.md`

---

## Next steps (planned / backlog)
- Curated homepage modules (Aeon-like)
- Richer widget set (video metadata, richer galleries, etc.)
