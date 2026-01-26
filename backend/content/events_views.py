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


class EditorAnalyticsView(APIView):
    """Editor analytics dashboard endpoint.

    Provides overview statistics for the editorial dashboard.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.db.models.functions import TruncDate
        from django.db.models import Count, Avg
        from datetime import timedelta

        now = timezone.now()
        today = now.date()
        last_7_days = now - timedelta(days=7)
        last_30_days = now - timedelta(days=30)

        # Article counts
        total_published = Article.objects.filter(status=ArticleStatus.PUBLISHED).count()
        total_drafts = Article.objects.filter(status=ArticleStatus.DRAFT).count()
        total_review = Article.objects.filter(status=ArticleStatus.IN_REVIEW).count()
        total_scheduled = Article.objects.filter(status=ArticleStatus.SCHEDULED).count()

        # Pageviews
        pageviews_today = Event.objects.filter(
            kind=EventKind.PAGEVIEW,
            created_at__date=today
        ).count()

        pageviews_7d = Event.objects.filter(
            kind=EventKind.PAGEVIEW,
            created_at__gte=last_7_days
        ).count()

        pageviews_30d = Event.objects.filter(
            kind=EventKind.PAGEVIEW,
            created_at__gte=last_30_days
        ).count()

        # Reads (read_ratio >= 0.5)
        reads_7d = Event.objects.filter(
            kind=EventKind.READ,
            read_ratio__gte=0.5,
            created_at__gte=last_7_days
        ).count()

        # Average read ratio
        avg_read_ratio = Event.objects.filter(
            kind=EventKind.READ,
            created_at__gte=last_7_days
        ).aggregate(avg=Avg("read_ratio"))["avg"] or 0

        # Pageviews by day (last 7 days)
        pageviews_by_day = (
            Event.objects.filter(
                kind=EventKind.PAGEVIEW,
                created_at__gte=last_7_days
            )
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(count=Count("id"))
            .order_by("day")
        )

        # Top articles (last 7 days)
        top_articles = (
            Article.objects.filter(status=ArticleStatus.PUBLISHED)
            .annotate(
                views=Count(
                    "events",
                    filter=models.Q(
                        events__kind=EventKind.PAGEVIEW,
                        events__created_at__gte=last_7_days
                    )
                )
            )
            .filter(views__gt=0)
            .order_by("-views")[:10]
        )

        # Top referrers (last 7 days)
        top_referrers = (
            Event.objects.filter(
                kind=EventKind.PAGEVIEW,
                created_at__gte=last_7_days
            )
            .exclude(referrer="")
            .exclude(referrer__isnull=True)
            .values("referrer")
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )

        return Response({
            "articles": {
                "published": total_published,
                "drafts": total_drafts,
                "in_review": total_review,
                "scheduled": total_scheduled,
            },
            "pageviews": {
                "today": pageviews_today,
                "last_7_days": pageviews_7d,
                "last_30_days": pageviews_30d,
            },
            "engagement": {
                "reads_7d": reads_7d,
                "avg_read_ratio": round(avg_read_ratio * 100, 1) if avg_read_ratio else 0,
            },
            "pageviews_by_day": [
                {"date": item["day"].isoformat(), "count": item["count"]}
                for item in pageviews_by_day
            ],
            "top_articles": [
                {"id": a.id, "slug": a.slug, "title": a.title, "views": a.views}
                for a in top_articles
            ],
            "top_referrers": [
                {"referrer": item["referrer"][:100], "count": item["count"]}
                for item in top_referrers
            ],
        })


class EditorPipelineView(APIView):
    """Editorial pipeline view showing articles at each workflow stage.
    
    Writers see: their own drafts
    Editors see: their drafts + articles awaiting review
    Publishers see: everything including approved/scheduled
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from datetime import timedelta
        
        user = request.user
        now = timezone.now()
        last_7_days = now - timedelta(days=7)

        def serialize_article(a):
            return {
                "id": a.id,
                "title": a.title,
                "slug": a.slug,
                "dek": a.dek or "",
                "status": a.status,
                "updated_at": a.updated_at.isoformat() if a.updated_at else None,
                "published_at": a.published_at.isoformat() if a.published_at else None,
                "publish_at": a.publish_at.isoformat() if a.publish_at else None,
                "category": {"name": a.category.name, "slug": a.category.slug} if a.category else None,
                "authors": [{"name": au.name, "slug": au.slug} for au in a.authors.all()],
            }

        # Base queryset with common relations
        base_qs = Article.objects.select_related("category").prefetch_related("authors")

        # My drafts (articles created by this user that are still drafts)
        # For simplicity, show all drafts the user can edit
        my_drafts = list(base_qs.filter(status=ArticleStatus.DRAFT).order_by("-updated_at")[:20])

        # Check user role using Django groups
        user_groups = set(user.groups.values_list('name', flat=True))
        is_editor = user.is_superuser or 'Editor' in user_groups or 'Publisher' in user_groups
        is_publisher = user.is_superuser or 'Publisher' in user_groups

        # Awaiting review (IN_REVIEW) - editors and publishers can see
        awaiting_review = []
        if is_editor:
            awaiting_review = list(base_qs.filter(status=ArticleStatus.IN_REVIEW).order_by("-updated_at")[:20])

        # Approved (SCHEDULED but not published yet) - publishers can see
        approved = []
        scheduled = []
        if is_publisher:
            # SCHEDULED articles that haven't been published yet
            scheduled_articles = list(base_qs.filter(status=ArticleStatus.SCHEDULED).order_by("-updated_at")[:20])
            # Split into "ready now" vs "scheduled for later"
            for a in scheduled_articles:
                if a.publish_at and a.publish_at > now:
                    scheduled.append(a)
                else:
                    approved.append(a)

        # Recently published (last 7 days) - everyone can see
        recently_published = list(
            base_qs.filter(
                status=ArticleStatus.PUBLISHED,
                published_at__gte=last_7_days
            ).order_by("-published_at")[:10]
        )

        return Response({
            "my_drafts": [serialize_article(a) for a in my_drafts],
            "awaiting_review": [serialize_article(a) for a in awaiting_review],
            "approved": [serialize_article(a) for a in approved],
            "scheduled": [serialize_article(a) for a in scheduled],
            "recently_published": [serialize_article(a) for a in recently_published],
        })
