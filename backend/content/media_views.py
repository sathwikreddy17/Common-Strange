from __future__ import annotations

import secrets

from django.utils import timezone
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .media_pipeline import image_variants_webp
from .models import MediaAsset
from .permissions import IsWriter
from .serializers_media import MediaAssetSerializer, MediaUploadSerializer
from .storage import guess_content_type, key_join, put_bytes


class EditorMediaUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsWriter]

    def post(self, request):
        ser = MediaUploadSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        f = ser.validated_data["file"]
        raw = f.read()
        mime = getattr(f, "content_type", "") or guess_content_type(getattr(f, "name", "upload"))

        # Create DB row first so we get an ID for keying.
        asset = MediaAsset.objects.create(
            mime_type=mime,
            size_bytes=len(raw),
            caption=ser.validated_data.get("caption", ""),
            credit=ser.validated_data.get("credit", ""),
            license=ser.validated_data.get("license", ""),
            alt_text=ser.validated_data.get("alt_text", ""),
        )

        # Keys
        token = secrets.token_hex(8)
        base = key_join("media", str(asset.id), token)

        # Store original
        original_ext = (getattr(f, "name", "") or "").split(".")[-1].lower()
        original_ext = original_ext if original_ext and len(original_ext) <= 5 else "bin"
        original_key = key_join(base, f"original.{original_ext}")
        put_bytes(key=original_key, data=raw, content_type=mime)

        # Variants (webp)
        # If the file isn't an image Pillow can handle, just skip variants.
        width = height = None
        thumb_key = medium_key = large_key = ""
        try:
            variants = image_variants_webp(raw)
            (thumb_bytes, w, h) = variants["thumb"]
            thumb_key = key_join(base, "thumb.webp")
            put_bytes(key=thumb_key, data=thumb_bytes, content_type="image/webp")

            (med_bytes, w2, h2) = variants["medium"]
            medium_key = key_join(base, "medium.webp")
            put_bytes(key=medium_key, data=med_bytes, content_type="image/webp")

            (lg_bytes, w3, h3) = variants["large"]
            large_key = key_join(base, "large.webp")
            put_bytes(key=large_key, data=lg_bytes, content_type="image/webp")

            # Record dimensions from medium.
            width, height = w2, h2
        except Exception:
            pass

        asset.original_key = original_key
        asset.thumb_key = thumb_key
        asset.medium_key = medium_key
        asset.large_key = large_key
        asset.width = width
        asset.height = height
        asset.updated_at = timezone.now()
        asset.save()

        return Response({"media": MediaAssetSerializer(asset).data}, status=201)


class PublicMediaAssetDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk: int):
        try:
            asset = MediaAsset.objects.get(pk=pk)
        except MediaAsset.DoesNotExist:
            return Response({"detail": "Not found"}, status=404)

        return Response({"media": MediaAssetSerializer(asset).data})


class EditorMediaRecentView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsWriter]

    def get(self, request):
        limit_raw = request.query_params.get("limit", "24")
        try:
            limit = int(limit_raw)
        except Exception:
            limit = 24
        limit = max(1, min(limit, 100))

        qs = MediaAsset.objects.order_by("-created_at")[:limit]
        return Response({"items": MediaAssetSerializer(qs, many=True).data})
