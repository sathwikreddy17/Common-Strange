from django.contrib import admin

from .models import (
    Article,
    ArticleVersion,
    Author,
    Category,
    MediaAsset,
    PreviewToken,
    Series,
    Tag,
    Event,
    CuratedModule,
    CuratedModuleItem,
)


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


@admin.register(CuratedModule)
class CuratedModuleAdmin(admin.ModelAdmin):
    list_display = ("id", "placement", "title", "order", "is_active", "publish_at", "expires_at")
    list_filter = ("placement", "is_active")
    search_fields = ("title", "subtitle")
    ordering = ("placement", "order", "-updated_at")


@admin.register(CuratedModuleItem)
class CuratedModuleItemAdmin(admin.ModelAdmin):
    list_display = ("id", "module", "order", "item_type", "article", "category", "series", "author")
    list_filter = ("item_type",)
    search_fields = ("override_title", "override_dek")
    ordering = ("module", "order", "id")
