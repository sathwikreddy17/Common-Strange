from django.urls import include, path

from . import views

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
    path("authors/", views.AuthorListView.as_view(), name="authors"),
    path("authors/<slug:slug>/", views.AuthorDetailView.as_view(), name="author-detail"),

    # Editorial (session auth)
    path(
        "editor/",
        include(
            [
                path("articles/", views.EditorArticleCreateView.as_view(), name="editor-article-create"),
                path("articles/<int:pk>/", views.EditorArticleUpdateView.as_view(), name="editor-article-update"),
                path("articles/<int:pk>/submit/", views.EditorSubmitView.as_view(), name="editor-article-submit"),
                path("articles/<int:pk>/approve/", views.EditorApproveView.as_view(), name="editor-article-approve"),
                path("articles/<int:pk>/schedule/", views.EditorScheduleView.as_view(), name="editor-article-schedule"),
                path("articles/<int:pk>/publish_now/", views.EditorPublishNowView.as_view(), name="editor-article-publish-now"),
                path("articles/<int:pk>/preview_token/", views.EditorPreviewTokenView.as_view(), name="editor-article-preview-token"),
            ]
        ),
    ),
]
