# Backend status (Feb 2026) + what's ready for frontend work

This document is a short "handoff" snapshot so frontend work can proceed without rediscovering backend constraints.

## Source of truth
All scope/priority is derived from `Final PoC Blueprint.txt`.

## Deployment
- **Live**: https://commonstrange-api.onrender.com
- **Frontend**: https://commonstrange.onrender.com
- See `infra/docs/render-deployment.md` for full deployment details.
- See `infra/docs/deployment-bug-fixes.md` for issue history.

## Backend: implemented

### Workflow (Blueprint §4)
- State machine: `DRAFT → IN_REVIEW → SCHEDULED → PUBLISHED → ARCHIVED`
- Snapshots captured as `ArticleVersion` on key transitions
- Preview tokens (24h TTL) for draft review via `?preview_token=...`
- Cron-friendly publish job: `python manage.py publish_due_posts`

### Media + OG (Blueprint §7, §8)
- Multi-backend storage abstraction (`backend/content/storage.py`):
  - **Local**: MinIO (S3-compatible) for development
  - **Production**: Cloudinary CDN (free tier)
  - **Future-ready**: S3/R2 support built-in
- Editor media upload endpoint produces WebP variants.
- Public media serving via `GET /v1/media/<key>` (redirects to Cloudinary in prod).
- Public media metadata endpoint: `GET /v1/media-assets/<id>/`.
- Editor helper endpoint: `GET /v1/editor/media/recent/?limit=...`.
- Media API returns ready-to-use variant URLs (Cloudinary CDN URLs in production):
  - `thumb_url`, `medium_url`, `large_url`, `original_url`

### Events + trending (Blueprint §3 events)
- Public ingestion endpoints for `pageview` and `read`.
- Editor-only trending endpoint returns last-24h view counts.

### Search (Blueprint §5)
- Stored `tsvector` (`Article.search_tsv`) with GIN index.
- Tags included in vector.

### Health/observability
- `GET /v1/health/` (DB + cache best-effort)

## Frontend: ready (current)
- Next.js server components fetch with `BACKEND_INTERNAL_URL` (runtime) for SSR.
- Same-origin `/v1/*` proxy route exists for Docker/dev reliability.
- Images served directly from Cloudinary CDN — no backend proxy needed.

### Widgets
- Backend validates controlled widget schema including:
  - `pull_quote`, `related_card`, `youtube`, `gallery`
- Frontend renders:
  - `pull_quote`, `related_card`, `youtube`, `gallery`

## Biggest remaining items
1) OAuth social login (Google, GitHub)
2) Comments system
3) Custom domain setup
