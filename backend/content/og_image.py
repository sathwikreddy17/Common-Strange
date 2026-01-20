from __future__ import annotations

import os
from dataclasses import dataclass

from django.conf import settings
from django.utils.text import slugify


@dataclass(frozen=True)
class OgImageResult:
    key: str
    relative_path: str


def ensure_og_dir() -> str:
    out_dir = os.path.join(settings.MEDIA_ROOT, "og")
    os.makedirs(out_dir, exist_ok=True)
    return out_dir


def generate_placeholder_og_image(*, slug: str, title: str) -> OgImageResult:
    """Generate a placeholder OG image.

    PoC implementation: no image processing dependency. We just write an SVG.
    Modern platforms accept SVG for OG images in many cases; if not, we can
    swap to PNG later using Pillow.
    """

    out_dir = ensure_og_dir()
    safe_slug = slugify(slug) or "article"

    # store as svg
    filename = f"{safe_slug}.svg"
    abs_path = os.path.join(out_dir, filename)

    # Very small, clean SVG. Keep it simple.
    safe_title = (title or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    svg = f"""<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1200\" height=\"630\" viewBox=\"0 0 1200 630\">
  <defs>
    <linearGradient id=\"g\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">
      <stop offset=\"0%\" stop-color=\"#0f172a\"/>
      <stop offset=\"100%\" stop-color=\"#111827\"/>
    </linearGradient>
  </defs>
  <rect width=\"1200\" height=\"630\" fill=\"url(#g)\"/>
  <rect x=\"60\" y=\"60\" width=\"1080\" height=\"510\" rx=\"28\" fill=\"#0b1220\" opacity=\"0.75\"/>
  <text x=\"120\" y=\"210\" fill=\"#e5e7eb\" font-family=\"ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto\" font-size=\"28\" opacity=\"0.85\">Common Strange</text>
  <text x=\"120\" y=\"280\" fill=\"#ffffff\" font-family=\"ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto\" font-size=\"64\" font-weight=\"700\">{safe_title}</text>
</svg>
"""

    with open(abs_path, "w", encoding="utf-8") as f:
        f.write(svg)

    rel_path = f"og/{filename}"
    key = rel_path  # key is a relative path within MEDIA_ROOT for PoC
    return OgImageResult(key=key, relative_path=rel_path)
