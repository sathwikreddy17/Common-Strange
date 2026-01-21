from __future__ import annotations

from rest_framework import serializers

from .models import MediaAsset


class MediaAssetSerializer(serializers.ModelSerializer):
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
