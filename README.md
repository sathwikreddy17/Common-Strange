# Common Strange (PoC)

Production-shaped, local-first publishing platform.

## Monorepo structure
- `frontend/` Next.js (Vercel)
- `backend/` Django + DRF (Render)
- `infra/` deployment blueprints/runbooks
- `packages/` shared packages (currently placeholders for later extraction)

## PoC 1 scope (publishing spine)
- Draft → Review → Scheduled → Published
- Preview tokens
- Public read API consumed by Next.js with ISR
- SEO basics (sitemap + JSON-LD)

## Local dev (planned)
See `Final PoC Blueprint.txt` for the desired `docker-compose.yml` and Makefile targets.
