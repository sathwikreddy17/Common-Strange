from __future__ import annotations

from django.db import models
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .events import EventKind
from .models import Article, ArticleStatus, Event


class PageviewSerializer(serializers.Serializer):
    slug = serializers.SlugField()
    path = serializers.CharField(required=False, allow_blank=True, default="", max_length=512)
    referrer = serializers.CharField(required=False, allow_blank=True, default="", max_length=512)
    duration_ms = serializers.IntegerField(required=False, min_value=0)


class ReadSerializer(serializers.Serializer):
    slug = serializers.SlugField()
    read_ratio = serializers.FloatField(min_value=0.0, max_value=1.0)
    duration_ms = serializers.IntegerField(required=False, min_value=0)


class PageviewEventView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "events"

    def post(self, request):
        ser = PageviewSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        article = get_object_or_404(Article, slug=ser.validated_data["slug"], status=ArticleStatus.PUBLISHED)

        ua = (request.META.get("HTTP_USER_AGENT") or "")[:512]
        Event.objects.create(
            kind=EventKind.PAGEVIEW,
            article=article,
            path=ser.validated_data.get("path", "")[:512],
            referrer=ser.validated_data.get("referrer", "")[:512],
            user_agent=ua,
            duration_ms=ser.validated_data.get("duration_ms"),
        )
        return Response({"ok": True})


class ReadEventView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "events"

    def post(self, request):
        ser = ReadSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        article = get_object_or_404(Article, slug=ser.validated_data["slug"], status=ArticleStatus.PUBLISHED)

        ua = (request.META.get("HTTP_USER_AGENT") or "")[:512]
        Event.objects.create(
            kind=EventKind.READ,
            article=article,
            path=f"/{article.slug}"[:512],
            user_agent=ua,
            read_ratio=ser.validated_data["read_ratio"],
            duration_ms=ser.validated_data.get("duration_ms"),
        )
        return Response({"ok": True})


class EditorTrendingView(APIView):
    """Minimal editor-only trending endpoint.

    Aggregates last 24h pageviews.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        since = timezone.now() - timezone.timedelta(hours=24)

        qs = (
            Article.objects.filter(status=ArticleStatus.PUBLISHED)
            .annotate(
                views_24h=models.Count(
                    "events",
                    filter=models.Q(events__kind=EventKind.PAGEVIEW, events__created_at__gte=since),
                )
            )
            .filter(views_24h__gt=0)
            .order_by("-views_24h", "-published_at")[:50]
        )

        return Response(
            [
                {
                    "id": a.id,
                    "slug": a.slug,
                    "title": a.title,
                    "views_24h": a.views_24h,
                }
                for a in qs
            ]
        )


class PublicTrendingView(APIView):
    """Public trending endpoint with caching.

    Returns top articles by views in the last 24 hours.
    Blueprint PoC 3: expose trending to public for homepage.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from django.core.cache import cache

        cache_key = "public:trending:24h"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        since = timezone.now() - timezone.timedelta(hours=24)
        limit = min(int(request.query_params.get("limit", 10)), 20)

        qs = (
            Article.objects.filter(status=ArticleStatus.PUBLISHED)
            .select_related("category")
            .prefetch_related("authors")
            .annotate(
                views_24h=models.Count(
                    "events",
                    filter=models.Q(events__kind=EventKind.PAGEVIEW, events__created_at__gte=since),
                )
            )
            .filter(views_24h__gt=0)
            .order_by("-views_24h", "-published_at")[:limit]
        )

        result = [
            {
                "id": a.id,
                "slug": a.slug,
                "title": a.title,
                "dek": a.dek,
                "category": {"name": a.category.name, "slug": a.category.slug} if a.category else None,
                "authors": [{"name": au.name, "slug": au.slug} for au in a.authors.all()],
                "published_at": a.published_at.isoformat() if a.published_at else None,
            }
            for a in qs
        ]

        # Cache for 5 minutes
        cache.set(cache_key, result, timeout=300)

        return Response(result)
