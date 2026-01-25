"""Test settings.

Goal: allow running the backend test suite *locally* without Docker services.

- Uses SQLite in-memory DB by default.
- Disables S3/MinIO requirement.
- Uses local memory cache.
- Uses eager Celery (no Redis broker required).

Run:
  DJANGO_SETTINGS_MODULE=config.settings_test python manage.py test
"""

from __future__ import annotations

from .settings import *  # noqa: F403

# ---
# Database: SQLite (fast, no external services)
# ---
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# ---
# Media: allow filesystem fallback in tests (no S3/MinIO)
# ---
DEBUG = True
MEDIA_USE_S3 = False
ALLOW_FILESYSTEM_MEDIA_FALLBACK = True

# ---
# Cache: local memory
# ---
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "commonstrange-test-locmem",
        "TIMEOUT": 60,
    }
}

# ---
# Celery: run tasks synchronously during tests
# ---
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# ---
# Faster password hashing
# ---
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]
