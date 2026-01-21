from __future__ import annotations

import os
from dataclasses import dataclass

from django.conf import settings

from .storage import StoredObject, put_bytes


@dataclass(frozen=True)
class OgImageResult:
    key: str


def generate_placeholder_og_image(*, slug: str, title: str) -> OgImageResult:
    """Generate a minimal placeholder OG image (SVG).

    Kept for PoC convenience; publish-time PNG generation is the intended path.
    """

    safe_slug = (slug or "").strip() or "untitled"
    path = settings.MEDIA_ROOT / "og" / f"{safe_slug}.svg"
    path.parent.mkdir(parents=True, exist_ok=True)

    svg = f"""<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='630'>
  <rect width='100%' height='100%' fill='#0b1220'/>
  <text x='60' y='220' fill='#ffffff' font-size='56' font-family='ui-sans-serif, system-ui'>Common Strange</text>
  <text x='60' y='320' fill='#e5e7eb' font-size='44' font-family='ui-sans-serif, system-ui'>{title}</text>
</svg>"""

    path.write_text(svg, encoding="utf-8")
    rel_key = f"og/{safe_slug}.svg"
    return OgImageResult(key=rel_key)


def generate_publish_time_og_image_png(*, slug: str, title: str) -> StoredObject:
    """Generate a publish-time OG PNG (stored in S3-compatible storage).

    This is intentionally minimalist (no fonts) but matches the blueprint shape:
    - output: og/<slug>.png
    - stored in R2/MinIO via `content.storage`
    """

    # Lazy import to keep Pillow optional during early startup tooling.
    from PIL import Image, ImageDraw

    safe_slug = (slug or "").strip() or "untitled"
    key = f"og/{safe_slug}.png"

    img = Image.new("RGB", (1200, 630), color=(11, 18, 32))
    draw = ImageDraw.Draw(img)

    draw.text((60, 180), "Common Strange", fill=(255, 255, 255))
    draw.text((60, 260), (title or "").strip()[:120], fill=(229, 231, 235))

    import io

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    data = buf.getvalue()

    return put_bytes(key=key, data=data, content_type="image/png")
