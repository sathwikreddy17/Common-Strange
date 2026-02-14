"""Upload local media files to Cloudinary.

Usage:
    python manage.py upload_media_to_cloudinary --source /path/to/media_export/media
"""
import os

import cloudinary
import cloudinary.uploader
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Upload local media files to Cloudinary"

    def add_arguments(self, parser):
        parser.add_argument(
            "--source",
            type=str,
            required=True,
            help="Root directory containing media files (e.g. media_export/media)",
        )
        parser.add_argument(
            "--prefix",
            type=str,
            default="cs-media/media",
            help="Cloudinary folder prefix (default: cs-media/media)",
        )

    def handle(self, *args, **options):
        source = options["source"]
        prefix = options["prefix"].rstrip("/")

        if not os.path.isdir(source):
            self.stderr.write(self.style.ERROR(f"Source directory not found: {source}"))
            return

        # Verify Cloudinary is configured
        config = cloudinary.config()
        if not config.cloud_name:
            self.stderr.write(self.style.ERROR(
                "Cloudinary not configured. Set CLOUDINARY_URL env var."
            ))
            return

        self.stdout.write(f"Uploading from {source} to Cloudinary (cloud: {config.cloud_name})")
        self.stdout.write(f"Prefix: {prefix}")

        count = 0
        errors = 0

        for root, _dirs, files in os.walk(source):
            for fname in sorted(files):
                filepath = os.path.join(root, fname)
                # Relative path from source dir → e.g. 2/d359f36edca13b73/thumb.webp
                rel = os.path.relpath(filepath, source)
                # Public ID = prefix/rel without extension
                base = rel.rsplit(".", 1)[0] if "." in rel else rel
                public_id = f"{prefix}/{base}"
                ext = rel.rsplit(".", 1)[-1].lower() if "." in rel else ""

                # Determine resource type
                resource_type = "image"
                if ext not in ("webp", "png", "jpg", "jpeg", "gif", "svg", "bmp", "tiff"):
                    resource_type = "raw"

                try:
                    result = cloudinary.uploader.upload(
                        filepath,
                        public_id=public_id,
                        resource_type=resource_type,
                        overwrite=True,
                        format=ext,
                    )
                    url = result.get("secure_url", "?")
                    count += 1
                    self.stdout.write(f"  ✓ {rel} → {url}")
                except Exception as e:
                    errors += 1
                    self.stderr.write(self.style.ERROR(f"  ✗ {rel} → {e}"))

        self.stdout.write("")
        if errors:
            self.stdout.write(self.style.WARNING(f"Done: {count} uploaded, {errors} errors"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Done! Uploaded {count} files to Cloudinary"))
