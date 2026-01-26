from __future__ import annotations

import re
from rest_framework import serializers

from .models import Article, Author, Category, MediaAsset, Series, Tag

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


def _preprocess_md(md: str) -> str:
    """
    Preprocess markdown to handle line breaks better.
    - Convert single newlines within paragraphs to <br> markers
    - Preserve double newlines as paragraph breaks
    - Handle lists and other block elements properly
    """
    if not md:
        return ""
    
    # Normalize line endings
    md = md.replace('\r\n', '\n').replace('\r', '\n')
    
    # Split into lines
    lines = md.split('\n')
    result = []
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        
        # Check if this is a block-level element (heading, list, blockquote, etc.)
        is_block = (
            stripped.startswith('#') or           # Heading
            stripped.startswith('-') or           # Unordered list
            stripped.startswith('*') and not stripped.endswith('*') or  # Unordered list (not bold)
            stripped.startswith('>') or           # Blockquote
            re.match(r'^\d+\.', stripped) or      # Ordered list
            stripped.startswith('```') or         # Code block
            stripped.startswith('|') or           # Table
            stripped == '' or                     # Empty line
            stripped == '---' or                  # Horizontal rule
            stripped == '***'                     # Horizontal rule
        )
        
        if is_block:
            result.append(line)
        else:
            # For regular text lines, add two spaces at the end for line break
            # (except for the last line before an empty line)
            next_line = lines[i + 1].strip() if i + 1 < len(lines) else ''
            if next_line and not next_line.startswith('#') and not next_line.startswith('-') and not next_line.startswith('>') and not re.match(r'^\d+\.', next_line):
                # Add two spaces at end to create a hard line break in markdown
                result.append(line + '  ')
            else:
                result.append(line)
    
    return '\n'.join(result)


def _render_md(md: str) -> str:
    """Render Markdown to sanitized HTML with line break preservation."""
    # Preprocess to handle line breaks
    processed_md = _preprocess_md(md or "")
    
    # Render markdown to HTML
    html = _md_renderer(processed_md)
    
    # Sanitize HTML
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
    authors = AuthorSerializer(many=True, read_only=True)
    category = CategorySerializer(read_only=True)
    series = SeriesSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    hero_image = serializers.SerializerMethodField()
    reading_time_minutes = serializers.SerializerMethodField()
    
    # Writable field for setting hero_media by ID
    hero_media = serializers.PrimaryKeyRelatedField(
        queryset=MediaAsset.objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
    )

    body_html = serializers.SerializerMethodField()

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
            "hero_image",
            "hero_media",  # writable field for setting hero image
            "reading_time_minutes",
        ]
