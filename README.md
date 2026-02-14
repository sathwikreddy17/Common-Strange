# Common Strange (PoC)

Production-shaped, local-first publishing platform.  
**Live site**: [https://commonstrange.onrender.com](https://commonstrange.onrender.com)  
**API**: [https://commonstrange-api.onrender.com](https://commonstrange-api.onrender.com)

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
- **Done**: Public media proxy: `GET /v1/media/<key>` (redirects to Cloudinary in production).
- **Done**: Public media metadata: `GET /v1/media-assets/<id>/` (includes `*_url` fields).
- **Done**: Editor upload endpoint: `POST /v1/editor/media/upload/`.
- **Done**: Editor recent uploads: `GET /v1/editor/media/recent/?limit=...`.
- **Done**: Image variants (thumb/medium/large) produced.
- **Done**: Hero images for articles (upload via editor, display on home page and article pages).
- **Done**: Cloudinary CDN integration for production media hosting.
- **Missing**: Video metadata model/storage beyond embeds (YouTube widget covers embed only).

### Widgets (Blueprint examples)
- **Done**: `pull_quote`
- **Done**: `related_card`
- **Done**: `youtube`
- **Done**: `gallery`

---

## Monorepo structure
- `frontend/` Next.js (Render, Docker)
- `backend/` Django + DRF (Render, Python runtime)
- `infra/` deployment blueprints/runbooks
- `packages/` shared packages (currently placeholders for later extraction)
- `.github/workflows/` CI pipeline (GitHub Actions)

---

## Current status (implemented)

### Publishing spine (workflow)
- Mandatory review workflow: `DRAFT → IN_REVIEW → SCHEDULED → PUBLISHED → ARCHIVED`
- Preview tokens for draft review (`?preview_token=...`, 24h TTL)
- Revision snapshots via `ArticleVersion` on key transitions
- Scheduled publish command: `publish_due_posts` (cron-friendly)

### Media pipeline (S3-compatible, stateless)
Blueprint-aligned: MinIO locally / Cloudinary CDN in production.
- S3-compatible storage abstraction (`backend/content/storage.py`)
- **Cloudinary integration** for production (free tier, 25GB/month bandwidth)
- Editor upload endpoint: `POST /v1/editor/media/upload/`
- Editor recent endpoint: `GET /v1/editor/media/recent/?limit=24`
- Image variants generated as WebP (thumb/medium/large)
- Public media proxy endpoint: `GET /v1/media/<key>` (redirects to Cloudinary in prod)
- Public media-asset metadata endpoint: `GET /v1/media-assets/<id>/`
- MediaAsset API now returns **ready-to-use URLs** (when available):
  - `thumb_url`, `medium_url`, `large_url`, `original_url`
- In production, URLs point to `https://res.cloudinary.com/...` CDN

### Social growth (publish-time OG images)
- OG PNG generated at publish time and stored in object storage (`og/<slug>.png`)

### Events + trending foundation
- `Event` model for `pageview` and `read` events
- Public endpoints:
  - `POST /v1/events/pageview/`
  - `POST /v1/events/read/`
- Editorial endpoint:
  - `GET /v1/editor/trending/` (last-24h pageviews)

### User Management & Authentication
Blueprint-aligned role hierarchy with session-based auth.
- **Roles**: Reader → Writer → Editor → Publisher (hierarchical permissions)
- **Registration**: Public signup creates reader accounts
- **Authentication**: Session-based with CSRF protection
- **User Profiles**: Display name, bio, avatar support
- **Reader Features**: Save articles, follow topics, reading history
- **Admin Features**: Publishers can create/manage staff accounts

#### Role Hierarchy & Permissions
Roles are hierarchical - higher roles inherit all permissions from lower roles:

| Permission | Writer | Editor | Publisher |
|------------|:------:|:------:|:---------:|
| Create article drafts | ✅ | ✅ | ✅ |
| Edit own articles | ✅ | ✅ | ✅ |
| Upload media | ✅ | ✅ | ✅ |
| View all articles | ✅ | ✅ | ✅ |
| Review articles | ❌ | ✅ | ✅ |
| Approve/reject submissions | ❌ | ✅ | ✅ |
| Schedule articles | ❌ | ✅ | ✅ |
| Publish articles | ❌ | ❌ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| Full admin access | ❌ | ❌ | ✅ |

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
- Home page with magazine-style layout:
  - Full-width hero section featuring article with hero image
  - Featured articles grid with hero image thumbnails
  - Newsletter CTA section
  - Latest + Trending sidebar layout
- Taxonomy browse pages (categories/authors/series/tags)
- Article page renders markdown/html plus widgets:
  - Hero image display (if assigned)
  - Reading time estimate
  - `pull_quote`
  - `related_card` (sidebar)
  - `youtube`
  - `gallery` (renders real media via `media-assets/<id>`)
- Edit button on articles for staff users (links to editor)

Editor UI:
- `/editor` dashboard with Home link
- `/editor/articles` article list with all articles
- `/editor/articles/new` create new articles
- `/editor/articles/[id]` edit articles:
  - Title, dek, body markdown
  - **ArticleEditor** - Split-view markdown editor with live preview
  - Hero image upload with preview
  - Taxonomy assignment (category, series, authors, tags)
  - Workflow buttons (submit/approve/schedule/publish)
- `/editor/media` upload + lookup + recent uploads picker
- `/editor/users` user management (Publisher only)
- Consistent navigation with Home links throughout

### Markdown Rendering System
The platform uses a unified markdown rendering approach between editor preview and public frontend:

**Backend Processing** (`serializers.py`):
- Converts markdown to sanitized HTML using `mistune` library
- Smart preprocessing handles bold numbered headings (`**1. Title**`)
- **Section Detection**: Distinguishes main sections (h2) from sub-sections (h4)
  - Main sections: Sequential numbered headings (1, 2, 3, 4...)
  - Sub-sections: When numbering resets to 1 within a section
- XSS protection via `bleach` sanitization
- Line break preservation within paragraphs

**Frontend Editor** (`ArticleEditor.tsx`):
- Split-view editor with Edit/Split/Preview modes
- Matching preview parser for editor-frontend parity
- Same smart heading detection as backend
- Real-time word count and reading time estimates
- Keyboard shortcuts (Ctrl+S save, Ctrl+B bold, Ctrl+I italic)
- Fullscreen editing mode (Ctrl+\\)

**Typography** (`globals.css`):
- h2: Main section headings (1.5em, bold, prominent spacing)
- h4: Sub-section headings (1.1em, semibold, tighter spacing)
- Proper list styling and paragraph spacing

Auth pages:
- `/login` user login with Home link
- `/signup` public registration with Home link
- `/account` user dashboard (profile, saved articles, settings) with Home link
- `/logout` sign out

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
- Articles:
  - `GET /articles/` - List all articles
  - `POST /articles/` - Create new article
  - `GET /articles/<id>/` - Get article details
  - `PUT|PATCH /articles/<id>/` - Update article
  - Workflow transitions + preview tokens
- Taxonomy: categories/authors/series/tags (CRUD)
- Media:
  - `POST /media/upload/`
  - `GET /media/recent/?limit=...`
- Analytics:
  - `GET /trending/`

### Auth API (session auth)
Base: `/v1/auth/`
- `GET /csrf/` - Get CSRF token
- `POST /register/` - Create account
- `POST /login/` - Login
- `POST /logout/` - Logout
- `GET /me/` - Current user info
- `GET|PUT /profile/` - User profile
- `POST /change-password/` - Change password
- `GET|POST /saved-articles/` - Saved articles
- `DELETE /saved-articles/<id>/` - Remove saved
- `GET|POST /followed-topics/` - Followed topics
- `GET /reading-history/` - Reading history
- `GET|POST /users/` - Admin user list/create (Publisher only)
- `GET|PUT|DELETE /users/<id>/` - Admin user detail (Publisher only)

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

Create demo staff users:
```bash
docker compose exec backend python manage.py shell -c "
from django.contrib.auth.models import User, Group

# Create groups if they don't exist
writer_group, _ = Group.objects.get_or_create(name='Writer')
editor_group, _ = Group.objects.get_or_create(name='Editor')
publisher_group, _ = Group.objects.get_or_create(name='Publisher')

# Create demo users (password: demo1234)
for username, group in [('writer1', writer_group), ('editor1', editor_group)]:
    user, created = User.objects.get_or_create(username=username, defaults={
        'email': f'{username}@example.com',
        'is_staff': True,
    })
    if created:
        user.set_password('demo1234')
        user.groups.add(group)
        user.save()
        print(f'Created {username}')
"
```

Seed demo content:
- `docker compose run --rm backend python manage.py seed_demo_content`

---

## Debugging notes
- Next.js server components fetching `/v1/...` need absolute URLs unless using the same-origin proxy.
  See: `infra/docs/debugging-nextjs-fetch-and-proxy.md`

---

## Next steps (planned / backlog)
- OAuth social login (Google, GitHub)
- Comments system
- Video metadata model beyond embeds
- Custom domain (commonstrange.com)

---

## Test Credentials (Development)
| Username | Password | Role | Capabilities |
|----------|----------|------|--------------|
| admin | *(set via createsuperuser)* | Publisher | Full access - publish, manage users, all editor features |
| editor1 | demo1234 | Editor | Review, approve, schedule articles + all writer features |
| writer1 | demo1234 | Writer | Create drafts, edit own articles, upload media |

**Note**: Roles are hierarchical - Editors have all Writer permissions, Publishers have all Editor permissions.

## Production Credentials
| Username | Email | Role |
|----------|-------|------|
| admin | sathwikreddy1117@gmail.com | Superuser/Publisher |
| editor1 | editor1@example.com | Editor |
| writer1 | writer1@example.com | Writer |
| testuser | test@example.com | Reader |
