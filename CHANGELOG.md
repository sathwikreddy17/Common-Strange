# Changelog

All notable changes to Common Strange are documented here.

---

## [Unreleased]

### Added
- **Article Delete** — `DELETE /v1/editor/articles/<id>/` endpoint (Editor+ role) with frontend confirmation dialog (`workflow-buttons.tsx`)
- **TipTap WYSIWYG Editor** — Complete rebuild of `ArticleEditor.tsx` from raw markdown textarea to a professional TipTap (ProseMirror-based) rich text editor:
  - Full WYSIWYG formatting: bold, italic, underline, strikethrough, highlight
  - Headings dropdown (Paragraph, H1–H4)
  - Font size selector (8–36px) via `@tiptap/extension-text-style` FontSize
  - Bullet/ordered lists, blockquotes, code blocks, inline code
  - Link insertion, horizontal rules, text alignment (left/center/right)
  - Floating BubbleMenu on text selection for quick formatting
  - Proper Ctrl+Z/Y undo/redo (ProseMirror history)
  - Ctrl+S save, Ctrl+\\ fullscreen, Ctrl+P split preview shortcuts
  - Debounced HTML→Markdown conversion via Turndown (backend stores `body_md`)
  - Markdown→HTML parser for loading existing articles
  - Word count, character count, reading time in status bar
- **Split-screen Preview** — Side-by-side editor + rendered preview (toggle via toolbar icon or Ctrl+P), uses same prose styles as public pages
- **TipTap prose styles** in `globals.css` — placeholder text, highlight mark, editor focus styles

### Fixed
- **CRITICAL: Safari session leakage** — `SameSite=None` cookies allowed Safari to leak admin sessions through shared links (iMessage, iCloud Handoff). Changed to `SameSite=Lax` which is correct for same-site `*.onrender.com` deployments. (commit `549060b`)
- **CI failures** — Fixed 9 frontend lint errors + added `ALLOW_FILESYSTEM_MEDIA_FALLBACK=1` to CI env vars. CI fully green. (commit `9947c72`)
- **CSRF "no Referer" login bug** — `route.ts` proxy now forwards `Referer`/`Origin` headers to backend, fixing Django's CSRF rejection on login. (commit `902a3c7`)
- **Editor 404 on Render** — `editor/articles/[id]/page.tsx` and `editor/articles/list.tsx` had hardcoded `http://backend:8000` (Docker-internal hostname). Replaced with `getApiUrl()` which reads `BACKEND_INTERNAL_URL` from the environment.
- **New articles not appearing on homepage** — Fixed PostgreSQL NULLS FIRST ordering for `published_at`; reduced ISR revalidation from 60s to 30s.
- **Heading dropdown hidden behind editor** — Removed `overflow-x-auto` from toolbar (caused dropdown clipping); switched to `flex-wrap`; raised dropdown z-index to `z-[9999]`
- **Toolbar scrollbar** — Toolbar buttons now wrap naturally on smaller screens instead of showing a tiny horizontal scrollbar

### Changed
- **Frontend dependencies** — Added TipTap ecosystem (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`, `@tiptap/extension-underline`, `@tiptap/extension-link`, `@tiptap/extension-text-style`, `@tiptap/extension-text-align`, `@tiptap/extension-highlight`, `@tiptap/extension-typography`, `@tiptap/pm`), `turndown` + `@types/turndown` for HTML→Markdown
- **Branch cleanup** — Deleted 3 stale branches (`fix/safari-session-leak`, `fix/ci-failures`, `fix/csrf-referer-login`)

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
