from __future__ import annotations

import secrets
from typing import Optional

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError

from .widgets_schema import validate_widgets_json
from .events import EventKind


_RESERVED_ARTICLE_SLUGS = {
    "admin",
    "api",
    "static",
    "media",
    "assets",
    "dashboard",
    "login",
    "logout",
    "robots.txt",
    "sitemap.xml",
    "favicon.ico",
    "_next",
}


def _is_reserved_slug(slug: str) -> bool:
    s = (slug or "").strip().lower()
    if not s:
        return False
    if s in _RESERVED_ARTICLE_SLUGS:
        return True
    # Block anything under Next.js internals too
    if s.startswith("_next"):
        return True
    return False


class Author(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    bio = models.TextField(blank=True, default="")

    def __str__(self) -> str:
        return self.name


class Category(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    description = models.TextField(blank=True, default="")

    def __str__(self) -> str:
        return self.name


class Series(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    description = models.TextField(blank=True, default="")

    def __str__(self) -> str:
        return self.name


class Tag(models.Model):
    name = models.CharField(max_length=80)
    slug = models.SlugField(max_length=120, unique=True)

    def __str__(self) -> str:
        return self.name


class MediaAsset(models.Model):
    """Placeholder table for PoC 1.

    We create the table now to avoid later migration pain. PoC 1 does not
    expose upload endpoints or processing.
    """

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # S3/R2 object keys
    original_key = models.CharField(max_length=512, blank=True, default="")
    thumb_key = models.CharField(max_length=512, blank=True, default="")
    medium_key = models.CharField(max_length=512, blank=True, default="")
    large_key = models.CharField(max_length=512, blank=True, default="")

    # Metadata
    mime_type = models.CharField(max_length=127, blank=True, default="")
    size_bytes = models.BigIntegerField(default=0)
    width = models.IntegerField(null=True, blank=True)
    height = models.IntegerField(null=True, blank=True)

    caption = models.CharField(max_length=500, blank=True, default="")
    credit = models.CharField(max_length=200, blank=True, default="")
    license = models.CharField(max_length=120, blank=True, default="")
    alt_text = models.CharField(max_length=180, blank=True, default="")


class ArticleStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    IN_REVIEW = "IN_REVIEW", "In review"
    SCHEDULED = "SCHEDULED", "Scheduled"
    PUBLISHED = "PUBLISHED", "Published"
    ARCHIVED = "ARCHIVED", "Archived"


class Article(models.Model):
    title = models.CharField(max_length=250)
    slug = models.SlugField(max_length=270, unique=True)
    dek = models.CharField(max_length=500, blank=True, default="")

    body_md = models.TextField(blank=True, default="")
    widgets_json = models.JSONField(blank=True, default=dict)

    status = models.CharField(max_length=20, choices=ArticleStatus.choices, default=ArticleStatus.DRAFT)

    publish_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    category = models.ForeignKey(Category, null=True, blank=True, on_delete=models.SET_NULL)
    series = models.ForeignKey(Series, null=True, blank=True, on_delete=models.SET_NULL)
    authors = models.ManyToManyField(Author, blank=True)
    tags = models.ManyToManyField(Tag, blank=True)

    hero_media = models.ForeignKey(MediaAsset, null=True, blank=True, on_delete=models.SET_NULL)
    is_editor_pick = models.BooleanField(default=False)

    # Placeholder for PoC 2 (FTS). Will migrate to tsvector later.
    search_tsv = models.TextField(blank=True, default="")

    # Placeholder for PoC 2 (OG generation)
    og_image_key = models.CharField(max_length=512, blank=True, default="")

    def clean(self):
        super().clean()

        if _is_reserved_slug(self.slug):
            raise ValidationError({"slug": "This slug is reserved and cannot be used."})

        self.widgets_json = validate_widgets_json(self.widgets_json)

    def save(self, *args, **kwargs):
        # Ensure model-level validation runs on saves from custom endpoints too.
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.title


class ArticleVersionKind(models.TextChoices):
    SUBMIT = "SUBMIT", "Submit"
    APPROVE = "APPROVE", "Approve"
    SCHEDULE = "SCHEDULE", "Schedule"
    PUBLISH = "PUBLISH", "Publish"
    MANUAL = "MANUAL", "Manual"


class ArticleVersion(models.Model):
    article = models.ForeignKey(Article, on_delete=models.CASCADE, related_name="versions")
    kind = models.CharField(max_length=20, choices=ArticleVersionKind.choices)

    title = models.CharField(max_length=250)
    slug = models.SlugField(max_length=270)
    dek = models.CharField(max_length=500, blank=True, default="")
    body_md = models.TextField(blank=True, default="")
    widgets_json = models.JSONField(blank=True, default=dict)

    category = models.ForeignKey(Category, null=True, blank=True, on_delete=models.SET_NULL)
    series = models.ForeignKey(Series, null=True, blank=True, on_delete=models.SET_NULL)
    hero_media = models.ForeignKey(MediaAsset, null=True, blank=True, on_delete=models.SET_NULL)

    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )


class PreviewToken(models.Model):
    """Preview token for draft review.

    Grants access to a specific article version when present.
    TTL: 24 hours.
    """

    token = models.CharField(max_length=80, unique=True, db_index=True)

    article = models.ForeignKey(Article, on_delete=models.CASCADE)
    article_version = models.ForeignKey(ArticleVersion, null=True, blank=True, on_delete=models.SET_NULL)

    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )

    @classmethod
    def mint(
        cls,
        *,
        article: Article,
        article_version: Optional[ArticleVersion],
        created_by=None,
    ) -> "PreviewToken":
        token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timezone.timedelta(hours=24)
        return cls.objects.create(
            token=token,
            article=article,
            article_version=article_version,
            expires_at=expires_at,
            created_by=created_by,
        )

    def is_valid(self) -> bool:
        return timezone.now() < self.expires_at


class Event(models.Model):
    """Public events: pageviews and read completion.

    Blueprint: store events for trending and analytics. Keep schema minimal.
    """

    created_at = models.DateTimeField(auto_now_add=True)

    kind = models.CharField(max_length=20, default=EventKind.PAGEVIEW)
    article = models.ForeignKey(Article, on_delete=models.CASCADE, related_name="events")

    # Lightweight metadata (no user accounts in PoC)
    path = models.CharField(max_length=512, blank=True, default="")
    referrer = models.CharField(max_length=512, blank=True, default="")
    user_agent = models.CharField(max_length=512, blank=True, default="")

    # Optional metrics
    read_ratio = models.FloatField(null=True, blank=True)
    duration_ms = models.IntegerField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["kind", "created_at"]),
            models.Index(fields=["article", "created_at"]),
        ]
