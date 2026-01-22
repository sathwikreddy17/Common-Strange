from __future__ import annotations

from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector
from django.core.cache import cache
from django.db import models
from django.db.models.functions import Cast
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .events import EventKind
from .models import (
    Article,
    ArticleStatus,
    ArticleVersion,
    ArticleVersionKind,
    Author,
    Category,
    PreviewToken,
    Series,
    Tag,
)
from .permissions import IsEditor, IsPublisher, IsWriter
from .serializers import (
    ArticleDetailSerializer,
    ArticleListSerializer,
    AuthorSerializer,
    CategorySerializer,
    SeriesSerializer,
    TagSerializer,
)
from .og_image import generate_placeholder_og_image
from .search_index import update_article_search_tsv


class ExtractEpoch(models.Func):
    """Return seconds (float) from an interval/timedelta expression (Postgres)."""

    function = "EXTRACT"
    template = "EXTRACT(EPOCH FROM %(expressions)s)"
    output_field = models.FloatField()


# --------
# Public
# --------


class PublicArticleListView(generics.ListAPIView):
    serializer_class = ArticleListSerializer

    def get_queryset(self):
        qs = (
            Article.objects.all()
            .select_related("category", "series")
            .prefetch_related("authors", "tags")
        )

        # Safer default: only published unless explicitly requested.
        status_param = self.request.query_params.get("status")
        if status_param:
            if status_param.lower() == "published":
                qs = qs.filter(status=ArticleStatus.PUBLISHED)
        else:
            qs = qs.filter(status=ArticleStatus.PUBLISHED)

        category_slug = self.request.query_params.get("category")
        if category_slug:
            qs = qs.filter(category__slug=category_slug)

        tag_slug = self.request.query_params.get("tag")
        if tag_slug:
            qs = qs.filter(tags__slug=tag_slug)

        return qs.order_by("-published_at", "-updated_at")


class PublicArticleDetailView(generics.RetrieveAPIView):
    serializer_class = ArticleDetailSerializer
    lookup_field = "slug"

    def get_object(self):
        slug = self.kwargs["slug"]
        preview_token = self.request.query_params.get("preview_token")

        if preview_token:
            token = get_object_or_404(
                PreviewToken,
                token=preview_token,
                expires_at__gt=timezone.now(),
            )

            if token.article.slug != slug:
                # Hide existence of other articles/tokens in PoC1
                raise generics.Http404

            # Prefer rendering the exact snapshot linked to the token
            if token.article_version:
                a = token.article
                v = token.article_version
                a.title = v.title
                a.slug = v.slug
                a.dek = v.dek
                a.body_md = v.body_md
                a.widgets_json = v.widgets_json
                a.category = v.category
                a.series = v.series
                a.hero_media = v.hero_media
                return a

            return token.article

        return get_object_or_404(Article, slug=slug, status=ArticleStatus.PUBLISHED)


class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all().order_by("name")
    serializer_class = CategorySerializer


class AuthorListView(generics.ListAPIView):
    queryset = Author.objects.all().order_by("name")
    serializer_class = AuthorSerializer


class SeriesListView(generics.ListAPIView):
    queryset = Series.objects.all().order_by("name")
    serializer_class = SeriesSerializer


class TagListView(generics.ListAPIView):
    queryset = Tag.objects.all().order_by("name")
    serializer_class = TagSerializer


class TagArticleListView(generics.ListAPIView):
    serializer_class = ArticleListSerializer

    def get_queryset(self):
        slug = self.kwargs["slug"]
        return (
            Article.objects.filter(tags__slug=slug, status=ArticleStatus.PUBLISHED)
            .distinct()
            .select_related("category", "series")
            .prefetch_related("authors", "tags")
            .order_by("-published_at", "-updated_at")
        )


class CategoryArticleListView(generics.ListAPIView):
    serializer_class = ArticleListSerializer

    def get_queryset(self):
        slug = self.kwargs["slug"]
        return (
            Article.objects.filter(category__slug=slug, status=ArticleStatus.PUBLISHED)
            .select_related("category", "series")
            .prefetch_related("authors", "tags")
            .order_by("-published_at", "-updated_at")
        )


class SeriesDetailView(generics.RetrieveAPIView):
    queryset = Series.objects.all()
    serializer_class = SeriesSerializer
    lookup_field = "slug"


class AuthorDetailView(generics.RetrieveAPIView):
    queryset = Author.objects.all()
    serializer_class = AuthorSerializer
    lookup_field = "slug"


class SeriesArticleListView(generics.ListAPIView):
    serializer_class = ArticleListSerializer

    def get_queryset(self):
        slug = self.kwargs["slug"]
        return (
            Article.objects.filter(series__slug=slug, status=ArticleStatus.PUBLISHED)
            .select_related("category", "series")
            .prefetch_related("authors", "tags")
            .order_by("-published_at", "-updated_at")
        )


class AuthorArticleListView(generics.ListAPIView):
    serializer_class = ArticleListSerializer

    def get_queryset(self):
        slug = self.kwargs["slug"]
        return (
            Article.objects.filter(authors__slug=slug, status=ArticleStatus.PUBLISHED)
            .distinct()
            .select_related("category", "series")
            .prefetch_related("authors", "tags")
            .order_by("-published_at", "-updated_at")
        )


class ArticleSearchView(generics.ListAPIView):
    serializer_class = ArticleListSerializer

    def get_queryset(self):
        query = self.request.query_params.get("q", "").strip()
        qs = (
            Article.objects.filter(status=ArticleStatus.PUBLISHED)
            .select_related("category", "series")
            .prefetch_related("authors", "tags")
        )

        if not query:
            return qs.order_by("-published_at")[:0]

        # Blueprint: short-TTL cache for search results (safe if Redis is absent).
        cache_key = f"search:v1:q={query.lower()}"
        cached_ids = cache.get(cache_key)
        if isinstance(cached_ids, list) and cached_ids:
            preserved = models.Case(
                *[models.When(pk=pk, then=pos) for pos, pk in enumerate(cached_ids)],
                output_field=models.IntegerField(),
            )
            return (
                qs.filter(pk__in=cached_ids)
                .annotate(_order=preserved)
                .order_by("_order")
            )

        search_query = SearchQuery(query)

        # --- Boosting knobs (blueprint) ---
        since = timezone.now() - timezone.timedelta(hours=24)

        # Base FTS score (ts_rank_cd)
        base_rank = SearchRank(models.F("search_tsv"), search_query)

        # Editor pick: small additive bump.
        editor_pick_boost = models.Case(
            models.When(is_editor_pick=True, then=models.Value(0.15)),
            default=models.Value(0.0),
            output_field=models.FloatField(),
        )

        # Trending: normalize pageviews in last 24h via ln(views+1) so it doesn't dominate.
        views_24h = models.Count(
            "events",
            filter=models.Q(events__kind=EventKind.PAGEVIEW, events__created_at__gte=since),
        )
        trending_boost = (
            models.functions.Ln(models.Value(1.0) + Cast(views_24h, models.FloatField()))
            * models.Value(0.05)
        )

        # Recency: newer articles get a small bump (decays over a few days).
        # Postgres: age(now(), published_at) returns an interval.
        age_seconds = ExtractEpoch(models.Func(timezone.now(), models.F("published_at"), function="age"))
        recency_boost = models.Case(
            models.When(published_at__isnull=True, then=models.Value(0.0)),
            default=models.Value(0.2)
            / (
                models.Value(1.0)
                + (Cast(age_seconds, models.FloatField()) / models.Value(86400.0))
            ),
            output_field=models.FloatField(),
        )

        ranked = (
            qs.annotate(
                base_rank=base_rank,
                views_24h=views_24h,
                editor_pick_boost=editor_pick_boost,
                trending_boost=trending_boost,
                recency_boost=recency_boost,
                score=models.F("base_rank")
                + models.F("editor_pick_boost")
                + models.F("trending_boost")
                + models.F("recency_boost"),
            )
            .filter(base_rank__gte=0.1)
            .order_by("-score", "-published_at")
            .distinct()
        )

        # Cache the ordered IDs (TTL is controlled by default cache TIMEOUT).
        ids = list(ranked.values_list("id", flat=True)[:50])
        cache.set(cache_key, ids, timeout=60)

        return ranked


# --------
# Editorial (taxonomy)
# --------


class _EditorTaxonomyPermissionMixin:
    """Shared access policy for taxonomy management.

    PoC rule: Editors (and superusers) can manage taxonomy.
    """

    permission_classes = [permissions.IsAuthenticated, IsEditor]


class EditorCategoryListCreateView(_EditorTaxonomyPermissionMixin, generics.ListCreateAPIView):
    queryset = Category.objects.all().order_by("name")
    serializer_class = CategorySerializer
    lookup_field = "slug"


class EditorCategoryDetailView(_EditorTaxonomyPermissionMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = Category.objects.all().order_by("name")
    serializer_class = CategorySerializer
    lookup_field = "slug"


class EditorAuthorListCreateView(_EditorTaxonomyPermissionMixin, generics.ListCreateAPIView):
    queryset = Author.objects.all().order_by("name")
    serializer_class = AuthorSerializer
    lookup_field = "slug"


class EditorAuthorDetailView(_EditorTaxonomyPermissionMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = Author.objects.all().order_by("name")
    serializer_class = AuthorSerializer
    lookup_field = "slug"


class EditorSeriesListCreateView(_EditorTaxonomyPermissionMixin, generics.ListCreateAPIView):
    queryset = Series.objects.all().order_by("name")
    serializer_class = SeriesSerializer
    lookup_field = "slug"


class EditorSeriesDetailView(_EditorTaxonomyPermissionMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = Series.objects.all().order_by("name")
    serializer_class = SeriesSerializer
    lookup_field = "slug"


class EditorTagListCreateView(_EditorTaxonomyPermissionMixin, generics.ListCreateAPIView):
    queryset = Tag.objects.all().order_by("name")
    serializer_class = TagSerializer
    lookup_field = "slug"


class EditorTagDetailView(_EditorTaxonomyPermissionMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = Tag.objects.all().order_by("name")
    serializer_class = TagSerializer
    lookup_field = "slug"


# --------
# Editorial
# --------


def _snapshot(article: Article, *, kind: str, user):
    return ArticleVersion.objects.create(
        article=article,
        kind=kind,
        title=article.title,
        slug=article.slug,
        dek=article.dek,
        body_md=article.body_md,
        widgets_json=article.widgets_json,
        category=article.category,
        series=article.series,
        hero_media=article.hero_media,
        created_by=user,
    )


class EditorArticleCreateView(generics.CreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsWriter]

    class InputSerializer(ArticleDetailSerializer):
        class Meta(ArticleDetailSerializer.Meta):
            read_only_fields = ["status", "published_at", "updated_at"]

    serializer_class = InputSerializer

    def perform_create(self, serializer):
        article = serializer.save(status=ArticleStatus.DRAFT)
        _snapshot(article, kind=ArticleVersionKind.MANUAL, user=self.request.user)


class EditorArticleUpdateView(generics.UpdateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsWriter]
    queryset = Article.objects.all()

    class InputSerializer(ArticleDetailSerializer):
        class Meta(ArticleDetailSerializer.Meta):
            read_only_fields = ["status", "published_at", "updated_at"]

    serializer_class = InputSerializer


class EditorSubmitView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsWriter]

    def post(self, request, pk: int):
        article = get_object_or_404(Article, pk=pk)
        if article.status != ArticleStatus.DRAFT:
            return Response({"detail": "Only drafts can be submitted."}, status=400)

        article.status = ArticleStatus.IN_REVIEW
        article.save()
        _snapshot(article, kind=ArticleVersionKind.SUBMIT, user=request.user)
        return Response({"status": article.status})


class EditorApproveView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsEditor]

    def post(self, request, pk: int):
        article = get_object_or_404(Article, pk=pk)
        if article.status != ArticleStatus.IN_REVIEW:
            return Response({"detail": "Only in-review articles can be approved."}, status=400)

        article.status = ArticleStatus.SCHEDULED
        if not article.publish_at:
            article.publish_at = timezone.now()
        article.save()

        _snapshot(article, kind=ArticleVersionKind.APPROVE, user=request.user)
        return Response({"status": article.status, "publish_at": article.publish_at})


class EditorScheduleView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPublisher]

    def post(self, request, pk: int):
        article = get_object_or_404(Article, pk=pk)
        if article.status not in [ArticleStatus.IN_REVIEW, ArticleStatus.SCHEDULED]:
            return Response({"detail": "Article must be in review or scheduled."}, status=400)

        publish_at = request.data.get("publish_at")
        if not publish_at:
            return Response({"detail": "publish_at is required."}, status=400)

        try:
            dt = timezone.datetime.fromisoformat(str(publish_at).replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = timezone.make_aware(dt, timezone.get_current_timezone())
        except Exception:
            return Response({"detail": "publish_at must be ISO8601."}, status=400)

        article.status = ArticleStatus.SCHEDULED
        article.publish_at = dt
        article.save()

        # Keep FTS materialized (blueprint) so search is fast once it publishes.
        update_article_search_tsv(article=article)

        _snapshot(article, kind=ArticleVersionKind.SCHEDULE, user=request.user)
        return Response({"status": article.status, "publish_at": article.publish_at})


class EditorPublishNowView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPublisher]

    def post(self, request, pk: int):
        article = get_object_or_404(Article, pk=pk)
        if article.status not in [ArticleStatus.SCHEDULED, ArticleStatus.IN_REVIEW]:
            return Response({"detail": "Article must be scheduled or in review."}, status=400)

        article.status = ArticleStatus.PUBLISHED
        article.published_at = timezone.now()
        if not article.publish_at:
            article.publish_at = article.published_at
        article.save()

        # Blueprint: materialize FTS vector at publish time.
        update_article_search_tsv(article=article)

        _snapshot(article, kind=ArticleVersionKind.PUBLISH, user=request.user)
        return Response({"status": article.status, "published_at": article.published_at})


class EditorPreviewTokenView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsWriter]

    def get(self, request, pk: int):
        article = get_object_or_404(Article, pk=pk)
        version = (
            article.versions.filter(kind=ArticleVersionKind.SUBMIT).order_by("-created_at").first()
            or article.versions.order_by("-created_at").first()
        )
        token = PreviewToken.mint(article=article, article_version=version, created_by=request.user)
        return Response({"preview_token": token.token, "expires_at": token.expires_at})


class EditorGenerateOgImageView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsEditor]

    def post(self, request, pk: int):
        article = get_object_or_404(Article, pk=pk)

        result = generate_placeholder_og_image(slug=article.slug, title=article.title)
        article.og_image_key = result.key
        article.save(update_fields=["og_image_key", "updated_at"])

        return Response({"og_image_key": article.og_image_key})
