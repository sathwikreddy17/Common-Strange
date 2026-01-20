from __future__ import annotations

from datetime import timedelta

from django.http import HttpResponse
from django.utils import timezone
from django.utils.text import Truncator

from .models import Article, ArticleStatus


def google_news_sitemap(request):
    """Simple Google News sitemap.

    Notes:
    - Intended for PoC usage (no multi-language, no image news tags, etc.).
    - Google News only wants *recent* URLs. We default to last 48 hours.
    """

    site_url = (request.scheme + "://" + request.get_host()).rstrip("/")

    cutoff = timezone.now() - timedelta(hours=48)

    qs = (
        Article.objects.filter(status=ArticleStatus.PUBLISHED, published_at__gte=cutoff)
        .only("slug", "title", "published_at", "updated_at")
        .order_by("-published_at")
    )

    # XML (kept minimal, but valid)
    parts: list[str] = []
    parts.append('<?xml version="1.0" encoding="UTF-8"?>')
    parts.append(
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
        'xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    )

    for a in qs:
        if not a.published_at:
            continue

        loc = f"{site_url}/{a.slug}"
        title = Truncator(a.title).chars(300)
        published = a.published_at.isoformat().replace("+00:00", "Z")

        parts.append("<url>")
        parts.append(f"  <loc>{loc}</loc>")
        parts.append("  <news:news>")
        parts.append("    <news:publication>")
        parts.append("      <news:name>Common Strange</news:name>")
        parts.append("      <news:language>en</news:language>")
        parts.append("    </news:publication>")
        parts.append(f"    <news:publication_date>{published}</news:publication_date>")
        parts.append(f"    <news:title>{title}</news:title>")
        parts.append("  </news:news>")
        parts.append("</url>")

    parts.append("</urlset>")

    xml = "\n".join(parts) + "\n"

    return HttpResponse(xml, content_type="application/xml; charset=utf-8")
