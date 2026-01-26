# Pre-Launch Checklist for Common Strange

This document tracks all features and fixes needed before going live.

---

## ✅ COMPLETED (Production Ready)

| Area | Feature | Status |
|------|---------|--------|
| **Publishing Spine** | Draft → Review → Scheduled → Published workflow | ✅ |
| | Preview tokens (24h TTL) | ✅ |
| | Revision snapshots (ArticleVersion) | ✅ |
| | Scheduled publish cron job | ✅ |
| **Media Pipeline** | S3-compatible storage (MinIO/R2) | ✅ |
| | Image upload + variants (thumb/medium/large) | ✅ |
| | Hero images for articles | ✅ |
| | Public media proxy | ✅ |
| **SEO Package** | sitemap.xml | ✅ |
| | robots.txt | ✅ |
| | Canonical URLs | ✅ |
| | JSON-LD (Article + Breadcrumb) | ✅ |
| **Search** | Postgres FTS with tsvector + GIN | ✅ |
| | Tags included in search | ✅ |
| **Auth & Roles** | Session-based auth with CSRF | ✅ |
| | Hierarchical roles (Writer→Editor→Publisher) | ✅ |
| | User registration + profiles | ✅ |
| **Frontend** | Magazine-style home page | ✅ |
| | Article pages with widgets | ✅ |
| | Taxonomy browse pages | ✅ |
| | Editor dashboard | ✅ |
| **Events** | Pageview + read tracking | ✅ |
| | Trending endpoint | ✅ |
| **Security** | Rate limiting (events, API) | ✅ |
| | CORS/CSRF configuration | ✅ |
| **Infra** | render.yaml blueprint | ✅ |
| | Docker Compose for local dev | ✅ |

---

## 🔴 CRITICAL (Must Fix Before Launch)

| # | Issue | Effort | Status |
|---|-------|--------|--------|
| 1 | Error handling in frontend - API failures show blank pages | Medium | ✅ |
| 2 | Loading states - No loading indicators during API calls | Low | ✅ |
| 3 | 404/Error pages - Missing custom error pages | Low | ✅ |
| 4 | Environment variables validation - No startup checks | Low | ✅ |
| 5 | Production CORS/CSRF settings - Domain configuration | Low | ✅ |

---

## 🟡 HIGH PRIORITY (Should Complete)

| # | Feature | Effort | Status |
|---|---------|--------|--------|
| 6 | Password reset flow | Medium | ✅ |
| 7 | Email verification | Medium | ✅ |
| 8 | HTTPS-only cookies in prod | Low | ✅ |
| 9 | Image optimization in frontend (next/image) | Low | ⬜ |
| 10 | Meta tags on all pages (title, description) | Medium | ✅ |
| 11 | Favicon + app icons | Low | ⬜ |
| 12 | OG images for non-article pages | Medium | ⬜ |

---

## 🟢 NICE TO HAVE (Post-Launch)

| # | Feature | Effort | Status |
|---|---------|--------|--------|
| 13 | Curated homepage modules (Aeon-like) | High | ⬜ |
| 14 | Category hub curated sections | High | ⬜ |
| 15 | Analytics dashboard for editors | Medium | ⬜ |
| 16 | Search ranking boosts (editor picks, recency) | Medium | ⬜ |
| 17 | Google News sitemap | Low | ⬜ |
| 18 | OAuth social login (Google/GitHub) | Medium | ⬜ |
| 19 | Comments system | High | ⬜ |
| 20 | Video metadata model | Medium | ⬜ |

---

## 📋 DEPLOYMENT CHECKLIST

```
□ Set up Cloudflare R2 bucket for media
□ Configure CDN (cdn.commonstrange.com)
□ Set up Render services from render.yaml
□ Configure Vercel deployment
□ Set all environment variables:
  □ Backend: DATABASE_URL, REDIS_URL, SECRET_KEY, ALLOWED_HOSTS, 
             CORS_ALLOWED_ORIGINS, CSRF_TRUSTED_ORIGINS, AWS_* for R2
  □ Frontend: NEXT_PUBLIC_API_BASE
□ Run migrations on production DB
□ Create superuser account
□ Seed initial content (or create fresh)
□ Test full workflow: create → review → schedule → publish
□ Test media upload end-to-end
□ Verify sitemap.xml and robots.txt
□ Test preview tokens
□ Set up monitoring/alerting (Sentry DSN)
```

---

## Implementation Notes

### Critical #1-3: Frontend Error Handling & Loading States

- Add `error.tsx` and `not-found.tsx` to app routes
- Add loading.tsx for suspense boundaries
- Add try-catch with user-friendly error messages

### Critical #4: Environment Validation

- Backend: Add startup checks in settings.py
- Frontend: Add runtime config validation

### High Priority #6: Password Reset

- Backend: Add `/v1/auth/password-reset/request/` and `/v1/auth/password-reset/confirm/`
- Frontend: Add `/forgot-password` and `/reset-password` pages
- Email: Configure SMTP or use console backend for dev

### High Priority #7: Email Verification

- Backend: Add email verification token model
- Backend: Add `/v1/auth/verify-email/` endpoint
- Frontend: Add verification page
- Require verification before certain actions

---

*Last updated: January 25, 2026*
