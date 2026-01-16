from django.contrib import admin

from .models import Article, ArticleVersion, Author, Category, MediaAsset, PreviewToken, Series, Tag


@admin.register(Author)
class AuthorAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    search_fields = ("name", "slug")


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    search_fields = ("name", "slug")


@admin.register(Series)
class SeriesAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    search_fields = ("name", "slug")


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    search_fields = ("name", "slug")


@admin.register(MediaAsset)
class MediaAssetAdmin(admin.ModelAdmin):
    list_display = ("id", "mime_type", "size_bytes", "created_at")


class ArticleVersionInline(admin.TabularInline):
    model = ArticleVersion
    extra = 0
    readonly_fields = ("kind", "created_at", "created_by")


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "status", "publish_at", "published_at", "updated_at")
    list_filter = ("status", "category", "series", "is_editor_pick", "tags")
    search_fields = ("title", "slug")
    filter_horizontal = ("authors", "tags")
    inlines = [ArticleVersionInline]


@admin.register(PreviewToken)
class PreviewTokenAdmin(admin.ModelAdmin):
    list_display = ("token", "article", "expires_at", "created_at")
    search_fields = ("token", "article__slug")
    list_filter = ("expires_at",)
