from __future__ import annotations

import logging

from celery import shared_task
from django.db import transaction
from django.utils import timezone

from .models import Article, ArticleStatus, MediaAsset
from .og_image import generate_publish_time_og_image_png
from .search_index import update_article_search_tsv

logger = logging.getLogger(__name__)


@shared_task
def generate_og_image_for_article(article_id: int) -> str:
    """Generate OG image for an article asynchronously."""
    try:
        article = Article.objects.get(pk=article_id)
        result = generate_publish_time_og_image_png(slug=article.slug, title=article.title)
        article.og_image_key = result.key
        article.save(update_fields=["og_image_key", "updated_at"])
        logger.info(f"Generated OG image for article {article_id}: {result.key}")
        return article.og_image_key
    except Article.DoesNotExist:
        logger.warning(f"Article {article_id} not found for OG image generation")
        return ""
    except Exception as e:
        logger.error(f"Failed to generate OG image for article {article_id}: {e}")
        raise


@shared_task
def update_search_index_for_article(article_id: int) -> bool:
    """Update the search index for an article asynchronously."""
    try:
        article = Article.objects.get(pk=article_id)
        update_article_search_tsv(article=article)
        logger.info(f"Updated search index for article {article_id}")
        return True
    except Article.DoesNotExist:
        logger.warning(f"Article {article_id} not found for search indexing")
        return False
    except Exception as e:
        logger.error(f"Failed to update search index for article {article_id}: {e}")
        raise


@shared_task
def process_uploaded_media_asset(media_asset_id: int, base_key: str) -> int:
    """Generate WebP variants for an uploaded image asynchronously.

    Reads the original from storage, produces thumb/medium/large WebP variants,
    stores them, and updates the MediaAsset record. Running this in Celery avoids
    blocking the upload request (and hitting Render's 30s timeout on large images).
    """
    from .media_pipeline import image_variants_webp
    from .storage import get_bytes, put_bytes, key_join

    try:
        asset = MediaAsset.objects.get(pk=media_asset_id)
    except MediaAsset.DoesNotExist:
        logger.warning(f"MediaAsset {media_asset_id} not found for variant generation")
        return 0

    if not asset.original_key:
        logger.warning(f"MediaAsset {media_asset_id} has no original_key; skipping variants")
        return media_asset_id

    try:
        raw = get_bytes(asset.original_key)
    except Exception as exc:
        logger.error(f"Could not fetch original for MediaAsset {media_asset_id}: {exc}")
        raise

    try:
        variants = image_variants_webp(raw)
    except Exception:
        # Not an image Pillow can handle — leave variants empty, original is enough.
        logger.info(f"MediaAsset {media_asset_id} is not an image; skipping variants")
        asset.updated_at = timezone.now()
        asset.save(update_fields=["updated_at"])
        return media_asset_id

    thumb_bytes, _, _ = variants["thumb"]
    med_bytes, mw, mh = variants["medium"]
    lg_bytes, _, _ = variants["large"]

    thumb_key = key_join(base_key, "thumb.webp")
    medium_key = key_join(base_key, "medium.webp")
    large_key = key_join(base_key, "large.webp")

    put_bytes(key=thumb_key, data=thumb_bytes, content_type="image/webp")
    put_bytes(key=medium_key, data=med_bytes, content_type="image/webp")
    put_bytes(key=large_key, data=lg_bytes, content_type="image/webp")

    asset.thumb_key = thumb_key
    asset.medium_key = medium_key
    asset.large_key = large_key
    asset.width = mw
    asset.height = mh
    asset.updated_at = timezone.now()
    asset.save(update_fields=["thumb_key", "medium_key", "large_key", "width", "height", "updated_at"])

    logger.info(f"Generated variants for MediaAsset {media_asset_id}")
    return media_asset_id


@shared_task
def aggregate_article_metrics() -> int:
    """Aggregate article metrics from events.
    
    Called periodically by cron to pre-compute trending data.
    """
    from django.db.models import Count, Avg, Q
    from .events import EventKind
    
    now = timezone.now()
    since_24h = now - timezone.timedelta(hours=24)
    since_7d = now - timezone.timedelta(days=7)
    
    articles = Article.objects.filter(status=ArticleStatus.PUBLISHED)
    
    count = 0
    for article in articles.iterator():
        views_24h = article.events.filter(
            kind=EventKind.PAGEVIEW,
            created_at__gte=since_24h
        ).count()
        
        views_7d = article.events.filter(
            kind=EventKind.PAGEVIEW,
            created_at__gte=since_7d
        ).count()
        
        views_total = article.events.filter(kind=EventKind.PAGEVIEW).count()
        
        avg_read = article.events.filter(
            kind=EventKind.READ,
            read_ratio__isnull=False
        ).aggregate(avg=Avg("read_ratio"))["avg"] or 0.0
        
        # Store in cache for now (could be a separate model later)
        from django.core.cache import cache
        cache.set(f"metrics:{article.id}", {
            "views_24h": views_24h,
            "views_7d": views_7d,
            "views_total": views_total,
            "avg_read_ratio": avg_read,
        }, timeout=3600)  # 1 hour
        
        count += 1
    
    logger.info(f"Aggregated metrics for {count} articles")
    return count


@shared_task
def cleanup_expired_preview_tokens() -> int:
    """Remove expired preview tokens."""
    from .models import PreviewToken
    
    deleted, _ = PreviewToken.objects.filter(
        expires_at__lt=timezone.now()
    ).delete()
    
    logger.info(f"Cleaned up {deleted} expired preview tokens")
    return deleted
