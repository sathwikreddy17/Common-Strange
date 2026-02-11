"""RSS/Atom feeds for public articles.

Blueprint: SEO & discoverability — provide an RSS feed like Aeon does.
"""
from __future__ import annotations

from django.contrib.syndication.views import Feed
from django.utils.feedgenerator import Atom1Feed

from .models import Article, ArticleStatus


class LatestArticlesFeed(Feed):
    """RSS 2.0 feed of the latest published articles."""

    title = "Common Strange"
    link = "/"
    description = "Ideas that expand your perspective — long-form essays, thoughtful analysis, and stories that matter."

    def items(self):
        return (
            Article.objects.filter(status=ArticleStatus.PUBLISHED)
            .select_related("category")
            .prefetch_related("authors")
            .order_by("-published_at")[:20]
        )

    def item_title(self, item: Article) -> str:
        return item.title

    def item_description(self, item: Article) -> str:
        return item.dek or ""

    def item_link(self, item: Article) -> str:
        return f"/{item.slug}"

    def item_pubdate(self, item: Article):
        return item.published_at

    def item_updateddate(self, item: Article):
        return item.updated_at

    def item_author_name(self, item: Article) -> str:
        authors = list(item.authors.all())
        if authors:
            return ", ".join(a.name for a in authors)
        return ""

    def item_categories(self, item: Article):
        cats = []
        if item.category:
            cats.append(item.category.name)
        return cats


class LatestArticlesAtomFeed(LatestArticlesFeed):
    """Atom 1.0 feed variant."""

    feed_type = Atom1Feed
    subtitle = LatestArticlesFeed.description


class CategoryArticlesFeed(Feed):
    """RSS feed scoped to a single category."""

    def get_object(self, request, slug):
        from .models import Category
        from django.shortcuts import get_object_or_404
        return get_object_or_404(Category, slug=slug)

    def title(self, obj):
        return f"Common Strange — {obj.name}"

    def link(self, obj):
        return f"/categories/{obj.slug}"

    def description(self, obj):
        return obj.description or f"Latest articles in {obj.name}"

    def items(self, obj):
        return (
            Article.objects.filter(
                status=ArticleStatus.PUBLISHED,
                category=obj,
            )
            .prefetch_related("authors")
            .order_by("-published_at")[:20]
        )

    def item_title(self, item: Article) -> str:
        return item.title

    def item_description(self, item: Article) -> str:
        return item.dek or ""

    def item_link(self, item: Article) -> str:
        return f"/{item.slug}"

    def item_pubdate(self, item: Article):
        return item.published_at

    def item_author_name(self, item: Article) -> str:
        authors = list(item.authors.all())
        if authors:
            return ", ".join(a.name for a in authors)
        return ""
