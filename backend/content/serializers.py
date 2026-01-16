from __future__ import annotations

from rest_framework import serializers

from .models import Article, Author, Category, Series

# PoC1: render article markdown to HTML on the server.
import mistune

_md_renderer = mistune.create_markdown(
    escape=True,
    plugins=[
        "strikethrough",
        "table",
        "task_lists",
        "url",
    ],
)


def _render_md(md: str) -> str:
    return _md_renderer(md or "")


class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Author
        fields = ["name", "slug", "bio"]


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["name", "slug", "description"]


class SeriesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Series
        fields = ["name", "slug", "description"]


class ArticleListSerializer(serializers.ModelSerializer):
    authors = AuthorSerializer(many=True)
    category = CategorySerializer()
    series = SeriesSerializer()

    class Meta:
        model = Article
        fields = [
            "title",
            "slug",
            "dek",
            "status",
            "published_at",
            "updated_at",
            "category",
            "series",
            "authors",
        ]


class ArticleDetailSerializer(serializers.ModelSerializer):
    authors = AuthorSerializer(many=True)
    category = CategorySerializer()
    series = SeriesSerializer()

    body_html = serializers.SerializerMethodField()

    def get_body_html(self, obj: Article) -> str:
        return _render_md(getattr(obj, "body_md", ""))

    class Meta:
        model = Article
        fields = [
            "title",
            "slug",
            "dek",
            "body_md",
            "body_html",
            "widgets_json",
            "status",
            "publish_at",
            "published_at",
            "updated_at",
            "category",
            "series",
            "authors",
            "og_image_key",
        ]
