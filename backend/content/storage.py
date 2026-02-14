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


def _use_cloudinary() -> bool:
    return bool(getattr(settings, "MEDIA_USE_CLOUDINARY", False))


def _cloudinary_public_id(key: str) -> str:
    """Convert a storage key like media/9/abc123/thumb.webp → cs-media/media/9/abc123/thumb"""
    # Strip extension for Cloudinary (it manages format separately)
    base = key.rsplit(".", 1)[0] if "." in key else key
    return f"cs-media/{base}"


def _cloudinary_url_for_key(key: str) -> str:
    """Return the Cloudinary delivery URL for a given key."""
    import cloudinary
    cloud_name = cloudinary.config().cloud_name or ""
    ext = key.rsplit(".", 1)[-1].lower() if "." in key else ""
    public_id = _cloudinary_public_id(key)
    return f"https://res.cloudinary.com/{cloud_name}/image/upload/{public_id}.{ext}"


def public_url_for_key(key: str) -> str:
    """Return a public URL for a stored object key."""
    if not key:
        return ""

    # Cloudinary: return direct CDN URL
    if _use_cloudinary():
        return _cloudinary_url_for_key(key)

    base = str(getattr(settings, "MEDIA_PUBLIC_BASE_URL", "") or "").rstrip("/")
    if base:
        return f"{base}/{key.lstrip('/')}"
    # Fallback: expose through backend public endpoint.
    return f"/v1/media/{key}"


def _public_url_for_key(key: str) -> str:
    # Back-compat for internal callers.
    return public_url_for_key(key)


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

    Uses Cloudinary when MEDIA_USE_CLOUDINARY=1, S3 when MEDIA_USE_S3=1,
    otherwise writes to MEDIA_ROOT.
    """
    content_type = content_type or "application/octet-stream"

    if _use_cloudinary():
        import cloudinary.uploader
        public_id = _cloudinary_public_id(key)
        ext = key.rsplit(".", 1)[-1].lower() if "." in key else "bin"
        resource_type = "image" if content_type.startswith("image/") else "raw"

        result = cloudinary.uploader.upload(
            data,
            public_id=public_id,
            resource_type=resource_type,
            overwrite=True,
            format=ext,
        )
        return StoredObject(
            key=key,
            public_url=result.get("secure_url", public_url_for_key(key)),
            content_type=content_type,
            size_bytes=len(data),
        )

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
            public_url=public_url_for_key(key),
            content_type=content_type,
            size_bytes=len(data),
        )

    # Local fallback
    out_path = (settings.MEDIA_ROOT / key).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(data)

    return StoredObject(
        key=key,
        public_url=public_url_for_key(key),
        content_type=content_type,
        size_bytes=len(data),
    )


def guess_content_type(filename: str) -> str:
    ct, _ = mimetypes.guess_type(filename)
    return ct or "application/octet-stream"


def get_bytes(key: str) -> bytes:
    """Retrieve raw bytes for a stored object by key."""
    if _use_cloudinary():
        import urllib.request
        url = _cloudinary_url_for_key(key)
        with urllib.request.urlopen(url, timeout=15) as resp:
            return resp.read()

    if getattr(settings, "MEDIA_USE_S3", False):
        bucket = getattr(settings, "AWS_STORAGE_BUCKET_NAME", "")
        if not bucket:
            raise ValueError("AWS_STORAGE_BUCKET_NAME is required when MEDIA_USE_S3=1")
        client = _s3_client()
        resp = client.get_object(Bucket=bucket, Key=key)
        return resp["Body"].read()

    # Local fallback
    path = (settings.MEDIA_ROOT / key).resolve()
    return path.read_bytes()


def delete_object(key: str) -> None:
    """Delete a stored object by key."""
    if _use_cloudinary():
        import cloudinary.uploader
        public_id = _cloudinary_public_id(key)
        cloudinary.uploader.destroy(public_id, resource_type="image")
        return

    if getattr(settings, "MEDIA_USE_S3", False):
        bucket = getattr(settings, "AWS_STORAGE_BUCKET_NAME", "")
        if not bucket:
            raise ValueError("AWS_STORAGE_BUCKET_NAME is required when MEDIA_USE_S3=1")
        client = _s3_client()
        client.delete_object(Bucket=bucket, Key=key)
        return

    # Local fallback
    path = (settings.MEDIA_ROOT / key).resolve()
    if path.exists():
        path.unlink()


def key_join(*parts: str) -> str:
    return "/".join(p.strip("/") for p in parts if p and p.strip("/"))
