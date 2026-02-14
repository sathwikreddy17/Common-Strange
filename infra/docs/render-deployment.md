# Render Deployment Guide

*Last updated: February 14, 2026*

## Live URLs

| Service | URL |
|---------|-----|
| **Frontend** | https://commonstrange.onrender.com |
| **Backend API** | https://commonstrange-api.onrender.com |
| **Health Check** | https://commonstrange-api.onrender.com/v1/health/ |

---

## Architecture Overview

```
┌──────────────────────┐     ┌──────────────────────┐
│   Frontend (Docker)  │────▶│  Backend API (Python) │
│   Next.js 16 + React │     │  Django 4.2 + DRF     │
│   commonstrange      │     │  commonstrange-api    │
│   Port: 3000         │     │  Port: 8000           │
└──────────────────────┘     └───────┬───────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
              ┌─────▼──────┐  ┌─────▼──────┐  ┌─────▼──────┐
              │ Postgres 18 │  │  Redis/    │  │ Cloudinary │
              │ (Render)    │  │  Valkey 8  │  │ (CDN)      │
              │ Free tier   │  │  (Render)  │  │ Free tier  │
              └────────────┘  │  Free tier  │  └────────────┘
                              └────────────┘
```

---

## Render Services

### 1. Database: `commonstrange-db`
- **Type**: PostgreSQL 18
- **Plan**: Free
- **Region**: Oregon (US West)
- **Internal URL**: `postgresql://commonstrange:***@dpg-d67cqn14tr6s73995k10-a/commonstrange`
- **External URL**: `postgresql://commonstrange:***@dpg-d67cqn14tr6s73995k10-a.oregon-postgres.render.com/commonstrange`

### 2. Redis: `commonstrange-redis`
- **Type**: Redis (Valkey 8)
- **Plan**: Free
- **Region**: Oregon
- **Internal URL**: `redis://red-d67ctfh4tr6s73997d10:6379`

### 3. Backend API: `commonstrange-api`
- **Type**: Web Service (Python 3.12)
- **Plan**: Free
- **Root Directory**: `backend`
- **Build Command**: `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
- **Start Command**: `gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2 --threads 2 --access-logfile -`
- **Health Check**: `/v1/health/`
- **Auto-Deploy**: On commit to `main`

### 4. Frontend: `commonstrange`
- **Type**: Web Service (Docker)
- **Plan**: Free
- **Root Directory**: `frontend`
- **Dockerfile**: `./Dockerfile`
- **Auto-Deploy**: On commit to `main`

---

## Environment Variables

### Backend (`commonstrange-api`)

| Key | Value | Notes |
|-----|-------|-------|
| `ALLOWED_HOSTS` | `commonstrange-api.onrender.com` | |
| `CLOUDINARY_URL` | `cloudinary://474151815534495:***@dbdbbta2f` | Cloudinary connection string |
| `CORS_ALLOWED_ORIGINS` | `https://commonstrange.onrender.com` | |
| `CSRF_TRUSTED_ORIGINS` | `https://commonstrange.onrender.com` | |
| `DATABASE_URL` | `postgresql://commonstrange:***@dpg-...` | Auto-linked from Render DB |
| `DEBUG` | `0` | |
| `MEDIA_USE_CLOUDINARY` | `1` | Enables Cloudinary storage backend |
| `PYTHON_VERSION` | `3.12.0` | |
| `REDIS_URL` | `redis://red-...` | Auto-linked from Render Redis |
| `SECRET_KEY` | *(generated)* | |

### Frontend (`commonstrange`)

| Key | Value | Notes |
|-----|-------|-------|
| `NEXT_PUBLIC_SITE_URL` | `https://commonstrange.onrender.com` | |
| `NEXT_PUBLIC_BACKEND_BASE` | `https://commonstrange-api.onrender.com` | |
| `NEXT_PUBLIC_API_BASE` | `https://commonstrange-api.onrender.com` | Baked at Docker build time |
| `BACKEND_INTERNAL_URL` | `https://commonstrange-api.onrender.com` | Runtime override for SSR |

---

## Media Storage (Cloudinary)

### Why Cloudinary?
Render's free tier has an **ephemeral filesystem** — files written during build or at runtime are lost on redeploy. Cloudinary provides free, persistent image hosting with a global CDN.

### Setup
- **Cloud Name**: `dbdbbta2f`
- **Free Tier Limits**: 25,000 transformations/month, 25GB storage, 25GB bandwidth
- **Media Prefix**: `cs-media/media/` (in Cloudinary)

### How It Works
1. `storage.py` checks `MEDIA_USE_CLOUDINARY` setting
2. **Upload**: `put_bytes()` → uploads to Cloudinary via their API
3. **URL Generation**: `public_url_for_key()` → returns `https://res.cloudinary.com/dbdbbta2f/image/upload/cs-media/media/...`
4. **Public proxy**: `PublicMediaView` at `/v1/media/<key>` redirects (302) to Cloudinary URL
5. **Serializers**: `hero_image` fields return direct Cloudinary CDN URLs

### URL Pattern
```
Storage key:    media/9/e4b0bdb138e6e0f7/thumb.webp
Cloudinary ID:  cs-media/media/9/e4b0bdb138e6e0f7/thumb
CDN URL:        https://res.cloudinary.com/dbdbbta2f/image/upload/cs-media/media/9/e4b0bdb138e6e0f7/thumb.webp
```

### Uploading New Media
New media uploaded via the editor (`POST /v1/editor/media/upload/`) will automatically go to Cloudinary when `MEDIA_USE_CLOUDINARY=1`.

### Bulk Upload (Local → Cloudinary)
```bash
# From project root, using the management command:
CLOUDINARY_URL=cloudinary://... MEDIA_USE_CLOUDINARY=1 \
  python manage.py upload_media_to_cloudinary --source /path/to/media/files
```

---

## CI/CD Pipeline

### GitHub Actions (`.github/workflows/ci.yml`)
Triggers on push/PR to `main`:

1. **Backend Tests**: Python 3.12 + Postgres 16, runs `python manage.py test`
2. **Frontend Checks**: Node 20, runs `npx tsc --noEmit` (type checking)

### Auto-Deploy
Both Render services have **Auto-Deploy: On Commit** enabled. Pushing to `main` triggers:
1. GitHub Actions CI checks
2. Render builds and deploys both services

---

## Database

### Current Data (as of Feb 14, 2026)
- **Articles**: 6 published
- **Media Assets**: 8 (IDs 2-9), 32 files total (original + thumb/medium/large variants)
- **Users**: 4 (admin, testuser, editor1, writer1)
- **Categories**: Tech, Technology, Culture
- **Series**: Deep Dives
- **Authors**: Sathwik, Jane Doe, John Smith

### Migration from Local
The production database was populated by:
1. Local `pg_dump` → imported via `psql` to Render's external Postgres URL
2. Media files exported from local MinIO → uploaded to Cloudinary

### Running Migrations
Migrations run automatically during build (`python manage.py migrate` in build command).

---

## Common Operations

### Trigger Manual Deploy
Go to Render Dashboard → Service → click "Manual Deploy" → "Deploy latest commit"

### Check Logs
Render Dashboard → Service → Logs (left sidebar)

### Access Django Admin
Visit `https://commonstrange-api.onrender.com/admin/` and login with superuser credentials.

### Add a New Environment Variable
Render Dashboard → Service → Environment → Add variable → Save (triggers redeploy)

---

## Free Tier Limitations

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| **Spin-down after 15min inactivity** | First request after idle takes ~50s | Expected on free tier; upgrade to Starter ($7/mo) to disable |
| **Ephemeral filesystem** | Files written at runtime are lost on redeploy | All media stored on Cloudinary CDN |
| **512MB RAM** | Limited concurrent requests | 2 Gunicorn workers with 2 threads each |
| **No Shell access** | Can't SSH into the container | Debug via logs; use external DB connection for queries |
| **750 free hours/month** | Services may pause near month end if multiple services | Monitor usage in Render dashboard |
