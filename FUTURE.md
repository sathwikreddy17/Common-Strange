# Future Improvements

Notes on things deliberately left out of the current build, and when/why to revisit them.
These are not bugs — the platform works fine without them. They're the right next steps
once the site is live and content is flowing.

---

## Post-launch (once you have real readers)

### Email verification & password reset (unblock immediately on launch)
The SMTP config is wired in `backend/config/settings.py` — just set `EMAIL_HOST`,
`EMAIL_HOST_USER`, and `EMAIL_HOST_PASSWORD` on Render. Recommended provider: **Resend**
(resend.com, free tier: 3 000 emails/month). See `backend/.env.example` for the exact
variables. Without this, users cannot recover their accounts.

### OAuth / social login (Google, GitHub)
Most readers won't create a password account. Adding `django-allauth` with Google OAuth
covers the majority case. High effort but high conversion impact. Revisit after you have
10+ regular readers and notice sign-up drop-off.

### Custom domain
`*.onrender.com` works but looks provisional. Buy a domain, point it at the Render
frontend service, and add it to `CSRF_TRUSTED_ORIGINS` and `CORS_ALLOWED_ORIGINS` in
the backend env vars. Free SSL is automatic on Render.

---

## Once content volume grows (50+ articles)

### TipTap JSON as source of truth
Currently the editor saves HTML → Turndown → Markdown. This works for standard prose
but loses fidelity on nested lists, inline code, and tables. Storing the TipTap/ProseMirror
JSON document natively would remove the Turndown round-trip entirely. This is a migration
(new `body_json` field, updated serializer, new renderer) — only worth doing if editors
start hitting formatting edge cases.

### Search trigram indexes for typo tolerance
Trigram similarity (`pg_trgm`) is already used in search ranking but without a GIN index
on the `title` field, it degrades to a full table scan. Add the index once you have
enough articles for it to matter:
```sql
CREATE INDEX content_article_title_trgm ON content_article USING GIN (title gin_trgm_ops);
```
Add the corresponding migration in Django.

### Metrics persistence (move from cache to DB)
`aggregate_article_metrics` currently stores trending data in Redis cache (1h TTL).
If Redis restarts, you lose the computed scores until the next beat tick. A dedicated
`ArticleMetrics` model (views_24h, views_7d, views_total, avg_read_ratio, computed_at)
would make this durable and queryable for editorial dashboards.

---

## Nice to have (post-audience)

### Comments
High implementation cost, high spam risk. Start with a hosted solution (Disqus, Coral)
before building custom. Only worth it if readers are actively asking for it.

### Video support
Currently only YouTube embeds are supported. A native video model (upload → Cloudinary
video → poster frame + playback) is meaningful work. Wait until a specific content need
arises.

### Newsletter / email digest
Integrate with a transactional ESP (Resend, Buttondown) to send new article notifications
to subscribers. Needs a `Subscriber` model + opt-in flow. Post-audience problem.

### Reading list / personalisation
`SavedArticle` and `FollowedTopic` models already exist in `accounts`. The read/save UI
is there. Personalised "because you follow X" recommendations would require either a
collaborative filter or a rules engine — only worth building once you have enough reading
history data to make it meaningful.

---

## Render-specific scaling notes

The current stack runs on Render free/starter tier. When traffic grows:

- **Backend:** scale to Render Standard ($7/mo) to avoid cold starts on the API service.
- **Celery worker:** already a separate service; scale independently.
- **Postgres:** Render's managed Postgres is fine to ~10k articles; no action needed.
- **Media CDN:** Cloudinary free tier gives 25 GB/month bandwidth. Upgrade the plan or
  switch to Cloudflare R2 (near-zero egress cost) if you hit the limit.
- **Redis:** Render's Redis free tier (25 MB) is enough for caching and Celery; upgrade
  if you add heavy session or queue usage.
