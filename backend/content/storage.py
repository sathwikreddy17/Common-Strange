from __future__ import annotations

import mimetypes
import os
from dataclasses import dataclass

import boto3
from django.conf import settings


@dataclass(frozen=True)
class StoredObject:
    key: str
    public_url: str
    content_type: str
    size_bytes: int


def _bucket_prefix() -> str:
    prefix = str(getattr(settings, "MEDIA_BUCKET_PREFIX", "") or "").strip("/")
    if not prefix:
        return ""
    return prefix + "/"


def _public_url_for_key(key: str) -> str:
    base = str(getattr(settings, "MEDIA_PUBLIC_BASE_URL", "") or "").rstrip("/")
    if base:
        return f"{base}/{key.lstrip('/')}"
    # Fallback: expose through backend public endpoint.
    return f"/v1/media/{key}"


def _s3_client():
    return boto3.client(
        "s3",
        endpoint_url=getattr(settings, "AWS_S3_ENDPOINT_URL", None) or None,
        region_name=getattr(settings, "AWS_S3_REGION_NAME", None) or None,
        aws_access_key_id=getattr(settings, "AWS_ACCESS_KEY_ID", None) or None,
        aws_secret_access_key=getattr(settings, "AWS_SECRET_ACCESS_KEY", None) or None,
    )


def put_bytes(*, key: str, data: bytes, content_type: str) -> StoredObject:
    """Store bytes under `key`.

    Uses S3-compatible storage when MEDIA_USE_S3=1. Otherwise writes to MEDIA_ROOT.
    """

    content_type = content_type or "application/octet-stream"

    if getattr(settings, "MEDIA_USE_S3", False):
        bucket = getattr(settings, "AWS_STORAGE_BUCKET_NAME", "")
        if not bucket:
            raise ValueError("AWS_STORAGE_BUCKET_NAME is required when MEDIA_USE_S3=1")

        client = _s3_client()
        client.put_object(
            Bucket=bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
        )
        return StoredObject(
            key=key,
            public_url=_public_url_for_key(key),
            content_type=content_type,
            size_bytes=len(data),
        )

    # Local fallback
    out_path = (settings.MEDIA_ROOT / key).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(data)

    return StoredObject(
        key=key,
        public_url=_public_url_for_key(key),
        content_type=content_type,
        size_bytes=len(data),
    )


def guess_content_type(filename: str) -> str:
    ct, _ = mimetypes.guess_type(filename)
    return ct or "application/octet-stream"


def key_join(*parts: str) -> str:
    return "/".join(p.strip("/") for p in parts if p and p.strip("/"))
