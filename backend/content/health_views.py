from __future__ import annotations

from django.core.cache import cache
from django.db import connection
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    """Minimal liveness/readiness endpoint.

    Checks:
    - DB connectivity (SELECT 1)
    - Cache roundtrip (best-effort; does not fail if cache backend is down)
    """

    permission_classes = [AllowAny]

    def get(self, request):
        # DB check
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
            cursor.fetchone()

        # Cache check (best-effort)
        cache_ok = True
        try:
            cache.set("health:ping", "pong", timeout=5)
            cache_ok = cache.get("health:ping") == "pong"
        except Exception:
            cache_ok = False

        return Response({"status": "ok", "db": True, "cache": cache_ok})
