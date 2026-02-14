# Deployment Bug Fixes & Issues Log

*Chronological record of issues encountered during Render deployment and their resolutions.*

---

## Issue #1: Health Check 404
**Date**: Feb 14, 2026  
**Symptom**: Render health checks failing, service not going live.  
**Root Cause**: Health check path was set to the default `/healthz` instead of the Django endpoint.  
**Fix**: Changed health check path to `/v1/health/` in Render service settings.

---

## Issue #2: `MEDIA_USE_S3` Startup Crash
**Date**: Feb 14, 2026  
**Symptom**: Backend crashed on startup with `RuntimeError: MEDIA_USE_S3 must be enabled in production`.  
**Root Cause**: `settings.py` has a safety guard requiring S3 in non-debug mode. Since we're not using S3 on the free tier, this blocked startup.  
**Fix**: Added `ALLOW_FILESYSTEM_MEDIA_FALLBACK=1` environment variable. Later replaced by Cloudinary integration (`MEDIA_USE_CLOUDINARY=1`).

---

## Issue #3: Frontend "No Articles" — Blank Homepage
**Date**: Feb 14, 2026  
**Symptom**: Homepage showed no articles even though the API had data.  
**Root Cause**: `NEXT_PUBLIC_API_BASE` was baked at Docker **build time** as `http://backend:8000` (the Docker Compose internal DNS name). In production on Render, there's no `backend` hostname — the frontend couldn't reach the API.  
**Fix**: Added `BACKEND_INTERNAL_URL` as a **runtime** environment variable that takes priority over the build-time `NEXT_PUBLIC_API_BASE`. Updated three files:
- `frontend/src/lib/config.ts` — `API_BASE_URL` checks `BACKEND_INTERNAL_URL` first
- `frontend/src/middleware.ts` — backend proxy uses `BACKEND_INTERNAL_URL` fallback
- `frontend/src/app/v1/[[...path]]/route.ts` — API proxy route uses `BACKEND_INTERNAL_URL` fallback

**Key Lesson**: Docker build ARGs (`ARG`) become static at build time. For values that differ between environments, use runtime env vars that the application reads at startup.

**Commit**: `ecde2c4`

---

## Issue #4: Media Images 404 — Ephemeral Filesystem
**Date**: Feb 14, 2026  
**Symptom**: All media URLs (hero images) returned 404. `curl` to `/v1/media/media/9/.../thumb.webp` → 404.  
**Root Cause**: Render's free Python runtime has an **ephemeral filesystem**. The `restore_media_from_github` management command ran during build and successfully wrote files, but the build container is separate from the runtime container — files don't persist.  

**Attempted Solutions** (failed):
1. ❌ Upload via file.io, transfer.sh, temp.sh, 0x0.st — all services either blocked or failed
2. ❌ Base64-encode media and embed in code — 7MB, too large
3. ❌ Render Shell — not available on free tier
4. ❌ GitHub temp branch + management command — files written during build don't persist to runtime

**Final Fix**: Cloudinary free tier for persistent media CDN.
- Added `cloudinary` package to requirements
- Updated `storage.py` with Cloudinary backend (`put_bytes`, `get_bytes`, `delete_object`)
- Updated `public_url_for_key()` to return Cloudinary CDN URLs
- Updated `PublicMediaView` to redirect (302) to Cloudinary
- Uploaded all 32 media files to Cloudinary via standalone script
- Set `MEDIA_USE_CLOUDINARY=1` and `CLOUDINARY_URL` on Render

**Commit**: `ec3ccd7`

---

## Issue #5: Hero Image URLs Not Using Cloudinary
**Date**: Feb 14, 2026  
**Symptom**: After Cloudinary setup, API still returned `/media/6/.../thumb.webp` instead of Cloudinary URLs. Images still broken.  
**Root Cause**: The `get_hero_image()` methods in `serializers.py` (both `ArticleListSerializer` and `ArticleDetailSerializer`) were constructing URLs **manually** using `MEDIA_PUBLIC_BASE_URL` setting instead of calling `public_url_for_key()` from `storage.py`. Since `MEDIA_PUBLIC_BASE_URL` was empty, URLs came out as `/{key}`.  
**Fix**: Updated both `get_hero_image()` methods to use `public_url_for_key()` which correctly routes through the Cloudinary URL generator.

**Key Lesson**: When adding a new storage backend, search the entire codebase for any place that constructs media URLs. Don't assume all URL generation goes through one function.

**Commit**: `56cdd53`

---

## Issue #6: Dockerfile ARG vs ENV
**Date**: Feb 14, 2026  
**Symptom**: Frontend environment variables were hardcoded to Docker Compose defaults.  
**Root Cause**: Dockerfile used `ENV` for `NEXT_PUBLIC_*` variables, which can't be overridden at build time.  
**Fix**: Changed to `ARG` with `ENV` set from `ARG`, allowing `--build-arg` overrides.

**Commit**: `64a2489`

---

## Summary of Key Architecture Decisions

### Media Storage Strategy
```
Local Dev:  MinIO (S3-compatible)  → storage.py → MEDIA_ROOT filesystem
Production: Cloudinary (free CDN)  → storage.py → Cloudinary API
Future:     Cloudflare R2 / AWS S3 → storage.py → boto3 S3 client
```

The `storage.py` abstraction layer means switching providers only requires:
1. Changing env vars (`MEDIA_USE_CLOUDINARY` vs `MEDIA_USE_S3`)
2. No code changes needed

### Frontend SSR URL Resolution
```
Client-side (browser):  NEXT_PUBLIC_API_BASE (build-time, baked into JS bundle)
Server-side (SSR/RSC):  BACKEND_INTERNAL_URL (runtime env, checked first)
Fallback:               NEXT_PUBLIC_API_BASE → http://localhost:8000
```

### Cookie/Session Configuration
```
Production: SameSite=None, Secure=True  (cross-origin Render domains)
Dev:        SameSite=Lax, Secure=False  (localhost)
```
