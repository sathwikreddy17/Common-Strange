from __future__ import annotations

from rest_framework import serializers

from .models import MediaAsset
from .storage import public_url_for_key


class MediaAssetSerializer(serializers.ModelSerializer):
    thumb_url = serializers.SerializerMethodField()
    medium_url = serializers.SerializerMethodField()
    large_url = serializers.SerializerMethodField()
    original_url = serializers.SerializerMethodField()

    def get_thumb_url(self, obj: MediaAsset) -> str:
        return public_url_for_key(getattr(obj, "thumb_key", "") or "") if getattr(obj, "thumb_key", "") else ""

    def get_medium_url(self, obj: MediaAsset) -> str:
        return public_url_for_key(getattr(obj, "medium_key", "") or "") if getattr(obj, "medium_key", "") else ""

    def get_large_url(self, obj: MediaAsset) -> str:
        return public_url_for_key(getattr(obj, "large_key", "") or "") if getattr(obj, "large_key", "") else ""

    def get_original_url(self, obj: MediaAsset) -> str:
        return public_url_for_key(getattr(obj, "original_key", "") or "") if getattr(obj, "original_key", "") else ""

    class Meta:
        model = MediaAsset
        fields = [
            "id",
            "created_at",
            "updated_at",
            "original_key",
            "thumb_key",
            "medium_key",
            "large_key",
            "original_url",
            "thumb_url",
            "medium_url",
            "large_url",
            "mime_type",
            "size_bytes",
            "width",
            "height",
            "caption",
            "credit",
            "license",
            "alt_text",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "original_key",
            "thumb_key",
            "medium_key",
            "large_key",
            "original_url",
            "thumb_url",
            "medium_url",
            "large_url",
            "mime_type",
            "size_bytes",
            "width",
            "height",
        ]


class MediaUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    caption = serializers.CharField(required=False, allow_blank=True, default="")
    credit = serializers.CharField(required=False, allow_blank=True, default="")
    license = serializers.CharField(required=False, allow_blank=True, default="")
    alt_text = serializers.CharField(required=False, allow_blank=True, default="")

