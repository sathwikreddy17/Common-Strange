from __future__ import annotations

from django.conf import settings
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
    - S3/R2 connectivity (if MEDIA_USE_S3 enabled)
    """

    permission_classes = [AllowAny]

    def get(self, request):
        # DB check
        db_ok = True
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
                cursor.fetchone()
        except Exception:
            db_ok = False

        # Cache check (best-effort)
        cache_ok = True
        try:
            cache.set("health:ping", "pong", timeout=5)
            cache_ok = cache.get("health:ping") == "pong"
        except Exception:
            cache_ok = False

        # S3/R2 check (best-effort, if enabled)
        s3_ok = None
        if settings.MEDIA_USE_S3:
            try:
                from .storage import get_s3_client
                client = get_s3_client()
                # Just test connectivity by listing bucket (limit 1)
                client.list_objects_v2(
                    Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                    MaxKeys=1,
                )
                s3_ok = True
            except Exception:
                s3_ok = False

        # Determine overall status
        # We require DB for the service to be healthy
        status = "ok" if db_ok else "unhealthy"
        status_code = 200 if db_ok else 503

        return Response(
            {
                "status": status,
                "db": db_ok,
                "cache": cache_ok,
                "s3": s3_ok,
            },
            status=status_code,
        )
