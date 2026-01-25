from __future__ import annotations

from rest_framework import serializers

from .models import CuratedItemType, CuratedModule, CuratedModuleItem
from .serializers import ArticleListSerializer, AuthorSerializer, CategorySerializer, SeriesSerializer


class CuratedModuleItemSerializer(serializers.ModelSerializer):
    article = ArticleListSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    series = SeriesSerializer(read_only=True)
    author = AuthorSerializer(read_only=True)

    class Meta:
        model = CuratedModuleItem
        fields = [
            "id",
            "order",
            "item_type",
            "override_title",
            "override_dek",
            "article",
            "category",
            "series",
            "author",
        ]


class CuratedModuleSerializer(serializers.ModelSerializer):
    items = CuratedModuleItemSerializer(many=True, read_only=True)

    # Scoping information for hub modules
    category = CategorySerializer(read_only=True)
    series = SeriesSerializer(read_only=True)
    author = AuthorSerializer(read_only=True)

    class Meta:
        model = CuratedModule
        fields = [
            "id",
            "placement",
            "title",
            "subtitle",
            "order",
            "publish_at",
            "expires_at",
            "is_active",
            "category",
            "series",
            "author",
            "items",
        ]
