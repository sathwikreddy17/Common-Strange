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
    Preprocess markdown to handle line breaks and formatting properly.
    - Converts bold numbered headings like **1. Title** to proper headings
    - Distinguishes main sections (##) from sub-sections (####)
    - Preserves numbered lists with correct sequence
    - Ensures proper spacing between blocks
    - Handles line breaks within paragraphs
    """
    if not md:
        return ""
    
    # Normalize line endings
    md = md.replace('\r\n', '\n').replace('\r', '\n')
    
    # Clean up malformed bold markers (e.g., ****7. **Title****** -> **7. Title**)
    md = re.sub(r'\*{3,}(\d+\.)', r'**\1', md)  # Fix leading excess asterisks
    md = re.sub(r'\*{3,}$', '**', md, flags=re.MULTILINE)  # Fix trailing excess asterisks
    
    # Split into lines for smarter heading detection
    lines = md.split('\n')
    result = []
    seen_main_sections = set()  # Track which main section numbers we've seen
    in_subsection_context = False  # Are we inside a section that has sub-items?
    last_main_section_num = 0
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        
        # Check for bold numbered heading pattern: **N. Title** or **N. Title
        bold_num_match = re.match(r'^\*\*(\d+)\.\s*\**([^*\n]+?)\**\s*$', stripped)
        if not bold_num_match:
            # Also try unclosed pattern: **N. Title (no closing **)
            bold_num_match = re.match(r'^\*\*(\d+)\.\s*([^*\n]+)$', stripped)
        
        if bold_num_match:
            num = int(bold_num_match.group(1))
            title = bold_num_match.group(2).strip().rstrip('*').strip()
            
            # Determine if this is a main section or sub-section:
            # - If the number resets to 1 after we've seen higher numbers, it's likely a sub-section
            # - If it's a continuation of the sequence, it's a main section
            # - Sub-sections typically restart numbering (1, 2, 3, 4) within a main section
            
            is_subsection = False
            
            if num == 1 and last_main_section_num > 0:
                # Number reset to 1 after we've had other sections - this is a sub-section
                is_subsection = True
                in_subsection_context = True
            elif in_subsection_context and num <= 10:
                # We're in a sub-section context and seeing low numbers
                # Check if this could be continuing the main sequence
                if num == last_main_section_num + 1 and num not in seen_main_sections:
                    # Likely returning to main sections
                    is_subsection = False
                    in_subsection_context = False
                else:
                    is_subsection = True
            elif num in seen_main_sections:
                # We've seen this number before as a main section, so this must be a sub-section
                is_subsection = True
            
            if is_subsection:
                # Use h4 for sub-sections (smaller heading)
                result.append(f'#### {num}. {title}')
            else:
                # Use h2 for main sections
                result.append(f'## {num}. {title}')
                seen_main_sections.add(num)
                last_main_section_num = num
            continue
        
        # Handle regular line processing for line breaks
        is_heading = stripped.startswith('#')
        is_bullet = bool(re.match(r'^[-•]\s+', stripped)) or bool(re.match(r'^\*\s+[^*]', stripped))
        is_numbered = bool(re.match(r'^\d+\.\s+[^*]', stripped)) or bool(re.match(r'^\d+\.\*\*', stripped))
        is_blockquote = stripped.startswith('>')
        is_code_fence = stripped.startswith('```')
        is_hr = stripped in ('---', '***', '___')
        is_empty = stripped == ''
        is_list = is_bullet or is_numbered
        is_block = is_heading or is_list or is_blockquote or is_code_fence or is_hr or is_empty
        
        # Get info about next line
        next_line = lines[i + 1].strip() if i + 1 < len(lines) else ''
        next_is_bullet = bool(re.match(r'^[-•]\s+', next_line)) or bool(re.match(r'^\*\s+[^*]', next_line))
        next_is_numbered = bool(re.match(r'^\d+\.\s+[^*]', next_line)) or bool(re.match(r'^\d+\.\*\*', next_line))
        next_is_bold_num = bool(re.match(r'^\*\*\d+\.', next_line))
        next_is_list = next_is_bullet or next_is_numbered
        next_is_block = (
            next_line.startswith('#') or 
            next_is_list or 
            next_is_bold_num or
            next_line.startswith('>') or 
            next_line.startswith('```') or
            next_line in ('---', '***', '___') or
            next_line == ''
        )
        
        if is_block:
            result.append(line)
        else:
            # For regular text lines not followed by a block, add soft line break
            if not next_is_block and next_line:
                # Add two spaces for a soft line break in markdown
                result.append(line.rstrip() + '  ')
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
        from .storage import public_url_for_key
        return {
            "id": media.id,
            "thumb": public_url_for_key(media.thumb_key) if media.thumb_key else None,
            "medium": public_url_for_key(media.medium_key) if media.medium_key else None,
            "large": public_url_for_key(media.large_key) if media.large_key else None,
            "original": public_url_for_key(media.original_key) if media.original_key else None,
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
        from .storage import public_url_for_key
        return {
            "id": media.id,
            "thumb": public_url_for_key(media.thumb_key) if media.thumb_key else None,
            "medium": public_url_for_key(media.medium_key) if media.medium_key else None,
            "large": public_url_for_key(media.large_key) if media.large_key else None,
            "original": public_url_for_key(media.original_key) if media.original_key else None,
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
