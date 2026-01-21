from __future__ import annotations

from celery import shared_task
from django.db import transaction

from .models import Article, MediaAsset
from .og_image import generate_publish_time_og_image_png


@shared_task
def generate_og_image_for_article(article_id: int) -> str:
    article = Article.objects.get(pk=article_id)
    result = generate_publish_time_og_image_png(slug=article.slug, title=article.title)
    article.og_image_key = result.key
    article.save(update_fields=["og_image_key", "updated_at"])
    return article.og_image_key


@shared_task
def process_uploaded_media_asset(media_asset_id: int) -> int:
    # Placeholder: could do heavier processing async later.
    MediaAsset.objects.filter(pk=media_asset_id).update(updated_at=MediaAsset.updated_at)
    return media_asset_id
