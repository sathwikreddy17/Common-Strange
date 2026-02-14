# Changelog

All notable changes to Common Strange are documented here.

---

## [Unreleased]

### Remaining
- OAuth social login (Google, GitHub)
- Comments system
- Custom domain setup
- Email SMTP configuration for password reset/verification
- Sentry error tracking setup

---

## [0.2.0] - 2026-02-14 — Production Deployment

### Added
- **Cloudinary CDN integration** for production media hosting
  - `storage.py` Cloudinary backend (put/get/delete)
  - `public_url_for_key()` returns Cloudinary CDN URLs
  - `PublicMediaView` redirects to Cloudinary in production
  - `upload_media_to_cloudinary` management command
  - All 32 media files uploaded to Cloudinary
- **CI/CD pipeline** via GitHub Actions (`.github/workflows/ci.yml`)
  - Backend: Python 3.12 + Postgres 16, runs Django test suite (167 tests)
  - Frontend: Node 20, TypeScript type checking
- **Render deployment** (all services live)
  - Backend API: Python 3.12 runtime, Gunicorn
  - Frontend: Docker (Next.js standalone)
  - PostgreSQL 18 (free tier)
  - Redis/Valkey 8 (free tier)
- **`BACKEND_INTERNAL_URL`** runtime env var for SSR API resolution
- **Dockerfile ARG support** for build-time `NEXT_PUBLIC_*` overrides
- **Deployment documentation** (`infra/docs/render-deployment.md`)
- **Bug fixes log** (`infra/docs/deployment-bug-fixes.md`)

### Fixed
- Frontend blank homepage: `NEXT_PUBLIC_API_BASE` baked at Docker build time → added runtime `BACKEND_INTERNAL_URL` override
- Media 404s: Render ephemeral filesystem → Cloudinary CDN
- Hero image serializers: manual URL construction → `public_url_for_key()` for proper Cloudinary URLs
- Health check path: default `/healthz` → `/v1/health/`
- Startup crash: `MEDIA_USE_S3` guard → updated for Cloudinary alternative

### Changed
- `render.yaml` updated with Cloudinary env vars, `BACKEND_INTERNAL_URL`
- `requirements.txt` now includes `cloudinary>=1.36`
- `settings.py` adds `MEDIA_USE_CLOUDINARY` setting with safety guard update

---

## [0.1.0] - 2026-01-27 — Feature Complete (Local)

### Added
- **Publishing spine**: DRAFT → IN_REVIEW → SCHEDULED → PUBLISHED → ARCHIVED workflow
- **Preview tokens** for draft review (24h TTL)
- **Revision snapshots** via ArticleVersion
- **Scheduled publish** command (`publish_due_posts`)
- **Media pipeline**: S3-compatible storage, image variants (thumb/medium/large WebP)
- **Hero images** for articles
- **OG image generation** at publish time
- **Postgres FTS** with tsvector + GIN index + trigram
- **Events tracking**: pageview + read events, trending endpoint
- **SEO package**: sitemap.xml, robots.txt, canonicals, JSON-LD
- **Widget system**: pull_quote, related_card, youtube, gallery
- **Auth & roles**: Session-based, Writer → Editor → Publisher hierarchy
- **User management**: Registration, profiles, saved articles, reading history
- **Password reset** and **email verification** flows
- **Editor dashboard**: Article management, media upload, analytics, taxonomy CRUD
- **Curated homepage modules** (Aeon-style)
- **Dark mode** support
- **RSS feed**
- **Table of contents** and **reading progress** indicator
- **Series navigation** between articles
- **Rate limiting** (events, API, auth)
- **Docker Compose** for local development (Django + Next.js + Postgres + Redis + MinIO)
- **167 backend tests** passing
