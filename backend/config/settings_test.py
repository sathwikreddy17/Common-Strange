"""Test settings.

Goal: allow running the backend test suite against Postgres (required for
SearchVectorField, pg_trgm, GIN indexes).

Works both locally (port-forwarded Docker Postgres) and inside Docker containers.

Run inside Docker:
  docker compose exec backend python manage.py test --settings=config.settings_test

Run locally (requires Docker Postgres on localhost:5432):
  DJANGO_SETTINGS_MODULE=config.settings_test python manage.py test
"""

from __future__ import annotations

import os

from .settings import *  # noqa: F403

# ---
# Database: Postgres (inherit host/port/credentials from env / parent settings)
# ---
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", "commonstrange"),
        "USER": os.getenv("POSTGRES_USER", "commonstrange"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", "commonstrange"),
        "HOST": os.getenv("POSTGRES_HOST", "localhost"),
        "PORT": int(os.getenv("POSTGRES_PORT", "5432")),
        "TEST": {
            "NAME": "commonstrange_test",
        },
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

# ---
# Disable throttling in tests so rate limits don't cause spurious failures
# ---
REST_FRAMEWORK = {
    **globals().get("REST_FRAMEWORK", {}),
    "DEFAULT_THROTTLE_RATES": {
        "auth": "10000/min",
        "events": "10000/min",
        "api": "10000/min",
    },
}
