# Backend status (Jan 2026) + what’s ready for frontend work

This document is a short “handoff” snapshot so frontend work can proceed without rediscovering backend constraints.

## Source of truth
All scope/priority is derived from `Final PoC Blueprint.txt`.

## Backend: implemented

### Workflow (Blueprint §4)
- State machine: `DRAFT → IN_REVIEW → SCHEDULED → PUBLISHED → ARCHIVED`
- Snapshots captured as `ArticleVersion` on key transitions
- Preview tokens (24h TTL) for draft review via `?preview_token=...`
- Cron-friendly publish job: `python manage.py publish_due_posts`

### Media + OG (Blueprint §7, §8)
- S3-compatible storage abstraction.
- Local dev uses MinIO. Production shape assumes R2/Cloudflare.
- Editor media upload endpoint produces WebP variants.
- Publish-time OG image generation writes `og/<slug>.png` to object storage.
- Production safety: filesystem media fallback is blocked outside `DEBUG` unless explicitly overridden.

### Events + trending (Blueprint §3 events)
- Public ingestion endpoints for `pageview` and `read`.
- Editor-only trending endpoint returns last-24h view counts.
- Abuse protection: DRF scoped throttling enabled for events.
- Retention: `python manage.py prune_events --days 90`.

### Search (Blueprint §5)
- Stored `tsvector` (`Article.search_tsv`) with GIN index.
- Tags included in vector.
- Ranking boosts: editor pick, recency decay, optional trending.
- Short TTL caching for queries.
- Maintenance backfill command: `python manage.py backfill_search_tsv`.

### Health/observability
- `GET /v1/health/` (DB + cache best-effort)
- Optional request timing logs: enable with `REQUEST_LOGGING=1`

## Frontend: known integration notes
- Next.js server components must fetch absolute URLs (build origin from request headers); relative `/v1/...` fetches can fail in SSR.
- The repo includes a same-origin `/v1/*` proxy route in Next.js for Docker/dev reliability.

## Biggest remaining blueprint items (before “polish UI”)
1) Curated homepage modules (Aeon-like)
   - Requires backend models and endpoints to define a homepage layout and curated slots.
2) Video widget (embeds + metadata)
   - Widget schema needs new widget type(s) and validation.
   - Frontend renderer + editor widgets form need to support it.

## Suggested next step
Implement curated homepage modules **first** (backend models + endpoints + minimal UI), then video widget in the widget schema.
