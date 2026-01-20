from django.urls import include, path

from . import views
from .news_sitemap import google_news_sitemap
from .og_views import PublicMediaView

urlpatterns = [
    # Public (read-only)
    path("articles/", views.PublicArticleListView.as_view(), name="public-articles"),
    path("articles/<slug:slug>/", views.PublicArticleDetailView.as_view(), name="public-article-detail"),

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
                path("articles/", views.EditorArticleCreateView.as_view(), name="editor-article-create"),
                path("articles/<int:pk>/", views.EditorArticleUpdateView.as_view(), name="editor-article-update"),
                path("articles/<int:pk>/submit/", views.EditorSubmitView.as_view(), name="editor-article-submit"),
                path("articles/<int:pk>/approve/", views.EditorApproveView.as_view(), name="editor-article-approve"),
                path("articles/<int:pk>/schedule/", views.EditorScheduleView.as_view(), name="editor-article-schedule"),
                path("articles/<int:pk>/publish_now/", views.EditorPublishNowView.as_view(), name="editor-article-publish-now"),
                path("articles/<int:pk>/preview_token/", views.EditorPreviewTokenView.as_view(), name="editor-article-preview-token"),
                path("articles/<int:pk>/generate_og/", views.EditorGenerateOgImageView.as_view(), name="editor-article-generate-og"),

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

    path("search/", views.ArticleSearchView.as_view(), name="article-search"),

    path("news-sitemap.xml", google_news_sitemap, name="google-news-sitemap"),
]

# Public media (generated assets)
urlpatterns += [
    path("media/<path:key>", PublicMediaView.as_view(), name="public-media"),
]
