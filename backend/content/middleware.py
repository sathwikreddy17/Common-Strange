from __future__ import annotations

import time

from django.utils.deprecation import MiddlewareMixin


class RequestTimingLogMiddleware(MiddlewareMixin):
    """Minimal request timing logging.

    Emits a single line per request for key endpoints so we can diagnose latency
    in Render logs without adding a full observability stack.

    Enabled only when REQUEST_LOGGING=1.
    """

    KEY_PREFIXES = (
        "/v1/search/",
        "/v1/events/",
        "/v1/editor/trending",
        "/v1/health/",
    )

    def process_request(self, request):
        request._cs_start = time.perf_counter()  # type: ignore[attr-defined]

    def process_response(self, request, response):
        try:
            path = getattr(request, "path", "") or ""
            if not path.startswith(self.KEY_PREFIXES):
                return response

            start = getattr(request, "_cs_start", None)
            if start is None:
                return response

            dur_ms = int((time.perf_counter() - start) * 1000)
            method = getattr(request, "method", "")
            status = getattr(response, "status_code", "")
            # Keep it grep-friendly.
            print(f"cs_req method={method} path={path} status={status} dur_ms={dur_ms}")
        except Exception:
            # Never break responses due to logging.
            pass

        return response
