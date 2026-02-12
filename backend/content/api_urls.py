from django.urls import include, path

from . import views
from .events_views import EditorTrendingView, EditorAnalyticsView, EditorPipelineView, PageviewEventView, PublicTrendingView, ReadEventView
from .feeds import LatestArticlesFeed, LatestArticlesAtomFeed, CategoryArticlesFeed
from .health_views import HealthView
from .news_sitemap import google_news_sitemap
from .og_views import PublicMediaView
from .media_views import EditorMediaUploadView, PublicMediaAssetDetailView, EditorMediaRecentView

urlpatterns = [
    # Health
    path("health/", HealthView.as_view(), name="health"),

    # Public (read-only)
    path("articles/", views.PublicArticleListView.as_view(), name="public-articles"),
    path("articles/by-ids/", views.PublicArticlesByIdsView.as_view(), name="public-articles-by-ids"),
    path("articles/<slug:slug>/", views.PublicArticleDetailView.as_view(), name="public-article-detail"),

    # Public curated modules (PoC 3)
    path("home/modules/", views.PublicHomeModulesView.as_view(), name="public-home-modules"),
    path("categories/<slug:slug>/modules/", views.PublicCategoryModulesView.as_view(), name="public-category-modules"),
    path("series/<slug:slug>/modules/", views.PublicSeriesModulesView.as_view(), name="public-series-modules"),
    path("authors/<slug:slug>/modules/", views.PublicAuthorModulesView.as_view(), name="public-author-modules"),

    # Public trending (PoC 3)
    path("trending/", PublicTrendingView.as_view(), name="public-trending"),

    # Public media assets (read-only)
    path("media-assets/<int:pk>/", PublicMediaAssetDetailView.as_view(), name="public-media-asset-detail"),

    # Events (public)
    path("events/pageview/", PageviewEventView.as_view(), name="events-pageview"),
    path("events/read/", ReadEventView.as_view(), name="events-read"),

    # Search
    path("search/", views.ArticleSearchView.as_view(), name="article-search"),

    path("categories/", views.CategoryListView.as_view(), name="categories"),
    path(
        "categories/<slug:slug>/articles/",
        views.CategoryArticleListView.as_view(),
        name="category-articles",
    ),

    path("series/", views.SeriesListView.as_view(), name="series"),
    path("series/<slug:slug>/", views.SeriesDetailView.as_view(), name="series-detail"),
    path(
        "series/<slug:slug>/articles/",
        views.SeriesArticleListView.as_view(),
        name="series-articles",
    ),

    path("authors/", views.AuthorListView.as_view(), name="authors"),
    path("authors/<slug:slug>/", views.AuthorDetailView.as_view(), name="author-detail"),
    path(
        "authors/<slug:slug>/articles/",
        views.AuthorArticleListView.as_view(),
        name="author-articles",
    ),

    path("tags/", views.TagListView.as_view(), name="tags"),
    path(
        "tags/<slug:slug>/articles/",
        views.TagArticleListView.as_view(),
        name="tag-articles",
    ),

    # Editorial (session auth)
    path(
        "editor/",
        include(
            [
                # Articles
                path("articles/", views.EditorArticleListCreateView.as_view(), name="editor-article-list-create"),
                path("articles/<int:pk>/", views.EditorArticleUpdateView.as_view(), name="editor-article-update"),
                path("articles/<int:pk>/submit/", views.EditorSubmitView.as_view(), name="editor-article-submit"),
                path("articles/<int:pk>/approve/", views.EditorApproveView.as_view(), name="editor-article-approve"),
                path("articles/<int:pk>/schedule/", views.EditorScheduleView.as_view(), name="editor-article-schedule"),
                path("articles/<int:pk>/publish_now/", views.EditorPublishNowView.as_view(), name="editor-article-publish-now"),
                path("articles/<int:pk>/preview_token/", views.EditorPreviewTokenView.as_view(), name="editor-article-preview-token"),
                path("articles/<int:pk>/generate_og/", views.EditorGenerateOgImageView.as_view(), name="editor-article-generate-og"),

                # Curated modules (Publisher)
                path("modules/", views.EditorCuratedModuleListCreateView.as_view(), name="editor-modules"),
                path("modules/<int:pk>/", views.EditorCuratedModuleDetailView.as_view(), name="editor-module-detail"),
                path(
                    "modules/<int:pk>/replace_items/",
                    views.EditorCuratedModuleReplaceItemsView.as_view(),
                    name="editor-module-replace-items",
                ),

                # Media
                path("media/upload/", EditorMediaUploadView.as_view(), name="editor-media-upload"),
                path("media/recent/", EditorMediaRecentView.as_view(), name="editor-media-recent"),

                # Trending (editor-only)
                path("trending/", EditorTrendingView.as_view(), name="editor-trending"),
                
                # Analytics dashboard
                path("analytics/", EditorAnalyticsView.as_view(), name="editor-analytics"),
                
                # Editorial pipeline
                path("pipeline/", EditorPipelineView.as_view(), name="editor-pipeline"),

                # Taxonomy
                path("categories/", views.EditorCategoryListCreateView.as_view(), name="editor-categories"),
                path(
                    "categories/<slug:slug>/",
                    views.EditorCategoryDetailView.as_view(),
                    name="editor-category-detail",
                ),
                path("authors/", views.EditorAuthorListCreateView.as_view(), name="editor-authors"),
                path(
                    "authors/<slug:slug>/",
                    views.EditorAuthorDetailView.as_view(),
                    name="editor-author-detail",
                ),
                path("series/", views.EditorSeriesListCreateView.as_view(), name="editor-series"),
                path(
                    "series/<slug:slug>/",
                    views.EditorSeriesDetailView.as_view(),
                    name="editor-series-detail",
                ),
                path("tags/", views.EditorTagListCreateView.as_view(), name="editor-tags"),
                path(
                    "tags/<slug:slug>/",
                    views.EditorTagDetailView.as_view(),
                    name="editor-tag-detail",
                ),
            ]
        ),
    ),

    path("news-sitemap.xml", google_news_sitemap, name="google-news-sitemap"),

    # RSS / Atom feeds
    path("feed/rss/", LatestArticlesFeed(), name="rss-feed"),
    path("feed/atom/", LatestArticlesAtomFeed(), name="atom-feed"),
    path("categories/<slug:slug>/feed/rss/", CategoryArticlesFeed(), name="category-rss-feed"),

    # Related articles (auto-recommendation)
    path("articles/<slug:slug>/related/", views.PublicRelatedArticlesView.as_view(), name="public-related-articles"),

    # Series navigation (prev/next)
    path("articles/<slug:slug>/series-nav/", views.PublicSeriesNavigationView.as_view(), name="public-series-navigation"),
]

# Public media (generated assets)
urlpatterns += [
    path("media/<path:key>", PublicMediaView.as_view(), name="public-media"),
]
