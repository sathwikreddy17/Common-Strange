from __future__ import annotations

from rest_framework import serializers

from .models import Article, Author, Category, Series, Tag

# PoC1: render article markdown to HTML on the server.
import mistune
import bleach

_md_renderer = mistune.create_markdown(
    escape=True,
    plugins=[
        "strikethrough",
        "table",
        "task_lists",
        "url",
    ],
)

# Allowed HTML tags for sanitization (XSS prevention)
_ALLOWED_TAGS = [
    "p", "br", "hr",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li",
    "a", "strong", "em", "b", "i", "u", "s", "del",
    "code", "pre", "blockquote",
    "img",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td",
    "span", "div",
]

_ALLOWED_ATTRS = {
    "a": ["href", "title", "rel", "target"],
    "img": ["src", "alt", "title", "width", "height"],
    "th": ["colspan", "rowspan"],
    "td": ["colspan", "rowspan"],
    "*": ["class"],  # Allow class for styling
}


def _render_md(md: str) -> str:
    """Render Markdown to sanitized HTML."""
    html = _md_renderer(md or "")
    return bleach.clean(
        html,
        tags=_ALLOWED_TAGS,
        attributes=_ALLOWED_ATTRS,
        strip=True,
    )


class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Author
        fields = ["id", "name", "slug", "bio"]


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description"]


class SeriesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Series
        fields = ["id", "name", "slug", "description"]


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["name", "slug"]


class ArticleListSerializer(serializers.ModelSerializer):
    authors = AuthorSerializer(many=True)
    category = CategorySerializer()
    series = SeriesSerializer()
    tags = TagSerializer(many=True)
    hero_image = serializers.SerializerMethodField()
    reading_time_minutes = serializers.SerializerMethodField()

    def get_hero_image(self, obj: Article) -> dict | None:
        """Return hero image URLs if available."""
        if not obj.hero_media:
            return None
        media = obj.hero_media
        from django.conf import settings
        base_url = getattr(settings, 'MEDIA_PUBLIC_BASE_URL', '')
        return {
            "id": media.id,
            "thumb": f"{base_url}/{media.thumb_key}" if media.thumb_key else None,
            "medium": f"{base_url}/{media.medium_key}" if media.medium_key else None,
            "large": f"{base_url}/{media.large_key}" if media.large_key else None,
            "original": f"{base_url}/{media.original_key}" if media.original_key else None,
            "width": media.width,
            "height": media.height,
            "alt": obj.title,  # Use article title as alt text
        }

    def get_reading_time_minutes(self, obj: Article) -> int:
        """Estimate reading time based on word count (~200 words/min)."""
        word_count = len((obj.body_md or "").split())
        return max(1, round(word_count / 200))

    class Meta:
        model = Article
        fields = [
            # Needed by the frontend (e.g. widgets like related_card reference articleId)
            "id",
            "title",
            "slug",
            "dek",
            "status",
            "published_at",
            "updated_at",
            "category",
            "series",
            "authors",
            "tags",
            "hero_image",
            "reading_time_minutes",
        ]


class ArticleDetailSerializer(serializers.ModelSerializer):
    authors = AuthorSerializer(many=True)
    category = CategorySerializer()
    series = SeriesSerializer()
    tags = TagSerializer(many=True)

    body_html = serializers.SerializerMethodField()

    def get_body_html(self, obj: Article) -> str:
        return _render_md(getattr(obj, "body_md", ""))

    class Meta:
        model = Article
        fields = [
            "id",
            "title",
            "slug",
            "dek",
            "body_md",
            "body_html",
            "widgets_json",
            "status",
            "publish_at",
            "published_at",
            "updated_at",
            "category",
            "series",
            "authors",
            "tags",
            "og_image_key",
        ]
