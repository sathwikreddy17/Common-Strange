from __future__ import annotations

import os

from django.conf import settings
from django.http import FileResponse, Http404
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView


class PublicMediaView(APIView):
    """Serve generated media by key.

    PoC-only: reads from MEDIA_ROOT and serves the file.

    Example: /v1/media/og/some-slug.svg
    """

    permission_classes = [AllowAny]

    def get(self, request, key: str):
        # prevent path traversal
        key = (key or "").lstrip("/")
        if ".." in key or key.startswith("/"):
            raise Http404

        abs_path = os.path.join(settings.MEDIA_ROOT, key)
        abs_path = os.path.abspath(abs_path)
        if not abs_path.startswith(os.path.abspath(settings.MEDIA_ROOT)):
            raise Http404

        if not os.path.exists(abs_path) or not os.path.isfile(abs_path):
            raise Http404

        return FileResponse(open(abs_path, "rb"), content_type=_guess_content_type(abs_path))


def _guess_content_type(path: str) -> str:
    lower = path.lower()
    if lower.endswith(".svg"):
        return "image/svg+xml"
    if lower.endswith(".png"):
        return "image/png"
    if lower.endswith(".jpg") or lower.endswith(".jpeg"):
        return "image/jpeg"
    return "application/octet-stream"
