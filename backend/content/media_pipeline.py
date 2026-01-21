from __future__ import annotations

import io

from PIL import Image


def _resize_to_fit(img: Image.Image, *, max_w: int, max_h: int) -> Image.Image:
    src_w, src_h = img.size
    if src_w <= max_w and src_h <= max_h:
        return img

    img = img.copy()
    img.thumbnail((max_w, max_h))
    return img


def image_variants_webp(data: bytes) -> dict[str, tuple[bytes, int, int]]:
    """Return webp variants.

    Returns a mapping of variant_name -> (bytes, width, height).
    """

    with Image.open(io.BytesIO(data)) as im:
        im = im.convert("RGBA") if im.mode in {"P", "LA"} else im.convert("RGB")

        variants: dict[str, Image.Image] = {
            "thumb": _resize_to_fit(im, max_w=320, max_h=320),
            "medium": _resize_to_fit(im, max_w=800, max_h=800),
            "large": _resize_to_fit(im, max_w=1600, max_h=1600),
        }

        out: dict[str, tuple[bytes, int, int]] = {}
        for name, v in variants.items():
            buf = io.BytesIO()
            v.save(buf, format="WEBP", quality=82, method=6)
            out[name] = (buf.getvalue(), v.size[0], v.size[1])
        return out
