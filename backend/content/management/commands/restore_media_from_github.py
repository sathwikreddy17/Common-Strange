"""One-shot command: download media files from the temp-media branch on GitHub."""
import io
import os
import tarfile
import urllib.request

from django.conf import settings
from django.core.management.base import BaseCommand


TARBALL_URL = (
    "https://github.com/sathwikreddy17/Common-Strange"
    "/archive/refs/heads/temp-media.tar.gz"
)
STRIP_PREFIX = "Common-Strange-temp-media/backend/media/"


class Command(BaseCommand):
    help = "Restore media files from the temp-media GitHub branch"

    def handle(self, *args, **options):
        media_root = settings.MEDIA_ROOT
        self.stdout.write(f"Downloading tarball from GitHub …")

        req = urllib.request.Request(TARBALL_URL)
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = resp.read()

        self.stdout.write(f"Downloaded {len(data)} bytes, extracting …")

        count = 0
        with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tar:
            for member in tar.getmembers():
                if not member.isfile():
                    continue
                if not member.name.startswith(STRIP_PREFIX):
                    continue
                rel = member.name[len(STRIP_PREFIX):]
                dest = os.path.join(media_root, rel)
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                with tar.extractfile(member) as src:
                    with open(dest, "wb") as dst:
                        dst.write(src.read())
                count += 1
                self.stdout.write(f"  ✓ {rel}")

        self.stdout.write(self.style.SUCCESS(f"\nDone! Restored {count} media files to {media_root}"))
