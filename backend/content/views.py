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
    CuratedModule,
    CuratedPlacement,
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
from .serializers_curated import CuratedModuleSerializer
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
    # Disable pagination for search results to match previous behavior
    pagination_class = None

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

        # Trigram similarity for typo tolerance (Blueprint requirement)
        from django.contrib.postgres.search import TrigramSimilarity
        trigram_score = TrigramSimilarity("title", query)

        ranked = (
            qs.annotate(
                base_rank=base_rank,
                trigram_score=trigram_score,
                views_24h=views_24h,
                editor_pick_boost=editor_pick_boost,
                trending_boost=trending_boost,
                recency_boost=recency_boost,
                # Combined score: FTS rank + trigram fallback + boosts
                score=models.F("base_rank")
                + (models.F("trigram_score") * models.Value(0.3))  # Trigram contributes 30%
                + models.F("editor_pick_boost")
                + models.F("trending_boost")
                + models.F("recency_boost"),
            )
            # Match if either FTS or trigram is relevant
            .filter(models.Q(base_rank__gte=0.05) | models.Q(trigram_score__gte=0.3))
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


class PublicHomeModulesView(generics.ListAPIView):
    """Public curated modules for the homepage.

    If modules are empty, the frontend should fall back to an algorithmic layout.
    """

    serializer_class = CuratedModuleSerializer

    def get_queryset(self):
        now = timezone.now()
        return (
            CuratedModule.objects.filter(
                placement=CuratedPlacement.HOME,
                is_active=True,
            )
            .filter(models.Q(publish_at__isnull=True) | models.Q(publish_at__lte=now))
            .filter(models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=now))
            .prefetch_related(
                "items",
                "items__article",
                "items__article__category",
                "items__article__series",
                "items__article__authors",
                "items__article__tags",
                "items__category",
                "items__series",
                "items__author",
            )
            .order_by("order", "id")
        )


class PublicCategoryModulesView(generics.ListAPIView):
    serializer_class = CuratedModuleSerializer

    def get_queryset(self):
        now = timezone.now()
        slug = self.kwargs["slug"]
        return (
            CuratedModule.objects.filter(
                placement=CuratedPlacement.CATEGORY,
                category__slug=slug,
                is_active=True,
            )
            .filter(models.Q(publish_at__isnull=True) | models.Q(publish_at__lte=now))
            .filter(models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=now))
            .prefetch_related(
                "items",
                "items__article",
                "items__article__category",
                "items__article__series",
                "items__article__authors",
                "items__article__tags",
                "items__category",
                "items__series",
                "items__author",
            )
            .order_by("order", "id")
        )


class PublicSeriesModulesView(generics.ListAPIView):
    serializer_class = CuratedModuleSerializer

    def get_queryset(self):
        now = timezone.now()
        slug = self.kwargs["slug"]
        return (
            CuratedModule.objects.filter(
                placement=CuratedPlacement.SERIES,
                series__slug=slug,
                is_active=True,
            )
            .filter(models.Q(publish_at__isnull=True) | models.Q(publish_at__lte=now))
            .filter(models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=now))
            .prefetch_related(
                "items",
                "items__article",
                "items__article__category",
                "items__article__series",
                "items__article__authors",
                "items__article__tags",
                "items__category",
                "items__series",
                "items__author",
            )
            .order_by("order", "id")
        )


class PublicAuthorModulesView(generics.ListAPIView):
    serializer_class = CuratedModuleSerializer

    def get_queryset(self):
        now = timezone.now()
        slug = self.kwargs["slug"]
        return (
            CuratedModule.objects.filter(
                placement=CuratedPlacement.AUTHOR,
                author__slug=slug,
                is_active=True,
            )
            .filter(models.Q(publish_at__isnull=True) | models.Q(publish_at__lte=now))
            .filter(models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=now))
            .prefetch_related(
                "items",
                "items__article",
                "items__article__category",
                "items__article__series",
                "items__article__authors",
                "items__article__tags",
                "items__category",
                "items__series",
                "items__author",
            )
            .order_by("order", "id")
        )


class PublicArticlesByIdsView(generics.ListAPIView):
    """Return published articles by numeric IDs.

    Query:
      /v1/articles/by-ids/?ids=1,2,3

    Used by widgets like `related_card` so the frontend doesn't fetch the entire article list.
    """

    serializer_class = ArticleListSerializer

    def get_queryset(self):
        raw = self.request.query_params.get("ids", "")
        parts = [p.strip() for p in raw.replace(" ", ",").split(",") if p.strip()]

        ids: list[int] = []
        for p in parts:
            try:
                n = int(p)
            except (TypeError, ValueError):
                continue
            if n > 0:
                ids.append(n)

        # Dedup while preserving order
        unique: list[int] = []
        seen: set[int] = set()
        for n in ids:
            if n not in seen:
                seen.add(n)
                unique.append(n)

        if not unique:
            return Article.objects.none()

        # Keep a reasonable upper bound for PoC.
        unique = unique[:50]

        qs = (
            Article.objects.filter(id__in=unique, status=ArticleStatus.PUBLISHED)
            .select_related("category", "series")
            .prefetch_related("authors", "tags")
        )

        # Preserve request order
        order = models.Case(*[models.When(id=n, then=pos) for pos, n in enumerate(unique)])
        return qs.order_by(order)


# --------
# Editorial (curation)
# --------


class _EditorCurationPermissionMixin:
    """Shared access policy for curation.

    Blueprint: "Publisher manages home modules".
    """

    permission_classes = [permissions.IsAuthenticated, IsPublisher]


class EditorCuratedModuleListCreateView(_EditorCurationPermissionMixin, generics.ListCreateAPIView):
    serializer_class = CuratedModuleSerializer

    def get_queryset(self):
        qs = CuratedModule.objects.all().order_by("placement", "order", "id")

        placement = self.request.query_params.get("placement")
        if placement:
            qs = qs.filter(placement=placement)

        # Optional filtering by scope slug for hub placements
        category_slug = self.request.query_params.get("category")
        if category_slug:
            qs = qs.filter(category__slug=category_slug)

        series_slug = self.request.query_params.get("series")
        if series_slug:
            qs = qs.filter(series__slug=series_slug)

        author_slug = self.request.query_params.get("author")
        if author_slug:
            qs = qs.filter(author__slug=author_slug)

        return qs.prefetch_related(
            "category",
            "series",
            "author",
            "items",
            "items__article",
            "items__article__category",
            "items__article__series",
            "items__article__authors",
            "items__article__tags",
            "items__category",
            "items__series",
            "items__author",
        )

    def create(self, request, *args, **kwargs):
        # Minimal PoC create: accept module metadata; items managed separately.
        data = request.data if isinstance(request.data, dict) else {}

        m = CuratedModule(
            placement=data.get("placement") or CuratedPlacement.HOME,
            title=(data.get("title") or ""),
            subtitle=(data.get("subtitle") or ""),
            order=int(data.get("order") or 0),
            is_active=bool(data.get("is_active", True)),
            publish_at=data.get("publish_at") or None,
            expires_at=data.get("expires_at") or None,
        )

        # Optional scoping (for hub modules)
        category_slug = data.get("category_slug")
        if category_slug:
            m.category = get_object_or_404(Category, slug=str(category_slug))

        series_slug = data.get("series_slug")
        if series_slug:
            m.series = get_object_or_404(Series, slug=str(series_slug))

        author_slug = data.get("author_slug")
        if author_slug:
            m.author = get_object_or_404(Author, slug=str(author_slug))

        # Back-compat: allow providing numeric IDs too
        if data.get("category"):
            m.category_id = int(data.get("category"))
        if data.get("series"):
            m.series_id = int(data.get("series"))
        if data.get("author"):
            m.author_id = int(data.get("author"))

        m.full_clean()
        m.save()

        return Response(CuratedModuleSerializer(m).data, status=status.HTTP_201_CREATED)


class EditorCuratedModuleDetailView(_EditorCurationPermissionMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CuratedModuleSerializer
    queryset = CuratedModule.objects.all().prefetch_related(
        "category",
        "series",
        "author",
        "items",
        "items__article",
        "items__article__category",
        "items__article__series",
        "items__article__authors",
        "items__article__tags",
        "items__category",
        "items__series",
        "items__author",
    )

    def update(self, request, *args, **kwargs):
        m: CuratedModule = self.get_object()
        data = request.data if isinstance(request.data, dict) else {}

        # Allow simple metadata updates.
        for k in ["title", "subtitle", "placement"]:
            if k in data:
                setattr(m, k, data.get(k) or "")

        if "order" in data:
            m.order = int(data.get("order") or 0)

        if "is_active" in data:
            m.is_active = bool(data.get("is_active"))

        if "publish_at" in data:
            m.publish_at = data.get("publish_at") or None

        if "expires_at" in data:
            m.expires_at = data.get("expires_at") or None

        # Allow scope updates by slug
        if "category_slug" in data:
            v = data.get("category_slug")
            m.category = get_object_or_404(Category, slug=str(v)) if v else None
        if "series_slug" in data:
            v = data.get("series_slug")
            m.series = get_object_or_404(Series, slug=str(v)) if v else None
        if "author_slug" in data:
            v = data.get("author_slug")
            m.author = get_object_or_404(Author, slug=str(v)) if v else None

        m.full_clean()
        m.save()
        return Response(CuratedModuleSerializer(m).data)


class EditorCuratedModuleReplaceItemsView(_EditorCurationPermissionMixin, APIView):
    """Replace items for a module.

    Payload:
      {"items": [{"order": 0, "item_type": "ARTICLE", "article": 123, "override_title": "", "override_dek": ""}, ...]}

    We choose "replace" semantics in PoC to keep UI + backend simple.
    """

    def post(self, request, pk: int):
        m = get_object_or_404(CuratedModule, pk=pk)
        data = request.data if isinstance(request.data, dict) else {}
        items = data.get("items")
        if not isinstance(items, list):
            return Response({"detail": "items must be a list"}, status=status.HTTP_400_BAD_REQUEST)

        # Delete existing items and recreate.
        m.items.all().delete()

        created = []
        from .models import CuratedModuleItem  # local import to avoid reordering the file

        for idx, it in enumerate(items):
            if not isinstance(it, dict):
                continue

            item_type = it.get("item_type") or "ARTICLE"
            order = int(it.get("order") if it.get("order") is not None else idx)

            ci = CuratedModuleItem(
                module=m,
                order=order,
                item_type=item_type,
                override_title=(it.get("override_title") or ""),
                override_dek=(it.get("override_dek") or ""),
            )

            # target FK field depends on item_type
            if item_type == "ARTICLE":
                ci.article_id = int(it.get("article"))
            elif item_type == "CATEGORY":
                ci.category_id = int(it.get("category"))
            elif item_type == "SERIES":
                ci.series_id = int(it.get("series"))
            elif item_type == "AUTHOR":
                ci.author_id = int(it.get("author"))

            ci.full_clean()
            ci.save()
            created.append(ci)

        m.refresh_from_db()
        return Response(CuratedModuleSerializer(m).data)
