from __future__ import annotations

import os

from django.conf import settings
from django.http import FileResponse, Http404, HttpResponse, HttpResponseRedirect
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from .storage import _use_cloudinary, _cloudinary_url_for_key


class PublicMediaView(APIView):
    """Serve generated media by key.

    When MEDIA_USE_CLOUDINARY=1, redirects to the Cloudinary CDN URL.
    When MEDIA_USE_S3=1, this proxies objects out of S3/MinIO (PoC-friendly).
    Otherwise it falls back to MEDIA_ROOT on disk.

    Example: /v1/media/og/some-slug.png
    """

    permission_classes = [AllowAny]

    def get(self, request, key: str):
        # prevent path traversal
        key = (key or "").lstrip("/")
        if ".." in key or key.startswith("/"):
            raise Http404

        # Cloudinary: redirect to CDN
        if _use_cloudinary():
            return HttpResponseRedirect(_cloudinary_url_for_key(key))

        if getattr(settings, "MEDIA_USE_S3", False):
            return self._get_from_s3(key)

        abs_path = os.path.join(settings.MEDIA_ROOT, key)
        abs_path = os.path.abspath(abs_path)
        if not abs_path.startswith(os.path.abspath(settings.MEDIA_ROOT)):
            raise Http404

        if not os.path.exists(abs_path) or not os.path.isfile(abs_path):
            raise Http404

        return FileResponse(open(abs_path, "rb"), content_type=_guess_content_type(abs_path))

    def _get_from_s3(self, key: str):
        import boto3

        bucket = getattr(settings, "AWS_STORAGE_BUCKET_NAME", "")
        if not bucket:
            raise Http404

        client = boto3.client(
            "s3",
            endpoint_url=getattr(settings, "AWS_S3_ENDPOINT_URL", None) or None,
            region_name=getattr(settings, "AWS_S3_REGION_NAME", None) or None,
            aws_access_key_id=getattr(settings, "AWS_ACCESS_KEY_ID", None) or None,
            aws_secret_access_key=getattr(settings, "AWS_SECRET_ACCESS_KEY", None) or None,
        )

        try:
            obj = client.get_object(Bucket=bucket, Key=key)
        except Exception:
            raise Http404

        body = obj.get("Body")
        data = body.read() if body else b""
        ct = obj.get("ContentType") or _guess_content_type(key)
        return HttpResponse(data, content_type=ct)


def _guess_content_type(path: str) -> str:
    lower = path.lower()
    if lower.endswith(".svg"):
        return "image/svg+xml"
    if lower.endswith(".png"):
        return "image/png"
    if lower.endswith(".webp"):
        return "image/webp"
    if lower.endswith(".jpg") or lower.endswith(".jpeg"):
        return "image/jpeg"
    return "application/octet-stream"
