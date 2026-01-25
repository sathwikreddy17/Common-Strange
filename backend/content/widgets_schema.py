from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, ValidationError
from urllib.parse import urlparse


class PullQuoteWidget(BaseModel):
    type: str = Field(pattern="^pull_quote$")
    text: str = Field(min_length=1)
    attribution: Optional[str] = None


class RelatedCardWidget(BaseModel):
    type: str = Field(pattern="^related_card$")
    articleId: int = Field(gt=0)


class YouTubeWidget(BaseModel):
    # Blueprint example: { type:"youtube", videoId:"..." }
    type: str = Field(pattern="^youtube$")
    videoId: str = Field(min_length=1)
    title: Optional[str] = None
    caption: Optional[str] = None


class GalleryWidget(BaseModel):
    # Blueprint example: { type:"gallery", mediaIds:[...] }
    type: str = Field(pattern="^gallery$")
    mediaIds: List[int] = Field(default_factory=list)
    title: Optional[str] = None
    caption: Optional[str] = None


class ImageWidget(BaseModel):
    # Blueprint-style single image embed: { type:"image", mediaId: 123, altText:"...", caption:"..." }
    type: str = Field(pattern="^image$")
    mediaId: int = Field(gt=0)
    altText: Optional[str] = None
    caption: Optional[str] = None


class EmbedWidget(BaseModel):
    """Generic external embed.

    Blueprint-style escape hatch for common embeds (twitter/x, instagram, spotify, etc.)
    while keeping strict validation.

    Example:
      {"type":"embed", "provider":"youtube", "url":"https://www.youtube.com/watch?v=...", "title":"..."}
    """

    type: str = Field(pattern="^embed$")
    provider: str = Field(min_length=1, max_length=50)
    url: str = Field(min_length=1, max_length=2000)
    title: Optional[str] = None
    caption: Optional[str] = None


class CalloutWidget(BaseModel):
    # Blueprint-style callout: { type:"callout", variant:"note"|"tip"|"warning", title?:"", text:"..." }
    type: str = Field(pattern="^callout$")
    variant: str = Field(min_length=1, max_length=20)
    title: Optional[str] = Field(default=None, max_length=120)
    text: str = Field(min_length=1)


class HeadingWidget(BaseModel):
    # Blueprint-style heading: { type:"heading", level: 2..4, text:"..." }
    type: str = Field(pattern="^heading$")
    level: int = Field(ge=2, le=4)
    text: str = Field(min_length=1, max_length=200)


class DividerWidget(BaseModel):
    # Blueprint-style divider: { type:"divider" }
    type: str = Field(pattern="^divider$")


_ALLOWED_EMBED_PROVIDERS = {
    "youtube",
    "vimeo",
    "spotify",
    "soundcloud",
    "substack",
    "instagram",
    "tiktok",
    "x",
    "twitter",
}


_ALLOWED_CALLOUT_VARIANTS = {"note", "tip", "warning"}


def _validate_embed_url(url: str) -> None:
    # Simple, strict-ish checks: require http(s), disallow javascript/data.
    u = (url or "").strip().lower()
    if not (u.startswith("https://") or u.startswith("http://")):
        raise ValueError("embed.url must start with http:// or https://")
    if u.startswith("javascript:") or u.startswith("data:"):
        raise ValueError("embed.url must not use javascript: or data:")


def _host_in(host: str, allowed: set[str]) -> bool:
    host = (host or "").lower()
    if host in allowed:
        return True
    # allow subdomains
    return any(host.endswith("." + h) for h in allowed)


_PROVIDER_ALLOWED_HOSTS: dict[str, set[str]] = {
    "youtube": {"youtube.com", "www.youtube.com", "youtu.be"},
    "vimeo": {"vimeo.com", "player.vimeo.com"},
    "spotify": {"open.spotify.com"},
    "soundcloud": {"soundcloud.com", "w.soundcloud.com"},
    "substack": {"substack.com"},
    "instagram": {"instagram.com", "www.instagram.com"},
    "tiktok": {"tiktok.com", "www.tiktok.com"},
    "x": {"x.com", "www.x.com", "twitter.com", "www.twitter.com"},
    "twitter": {"twitter.com", "www.twitter.com", "x.com", "www.x.com"},
}


def _validate_embed_url_for_provider(provider: str, url: str) -> None:
    _validate_embed_url(url)

    p = (provider or "").strip().lower()
    parsed = urlparse((url or "").strip())
    host = (parsed.hostname or "").lower()

    allowed_hosts = _PROVIDER_ALLOWED_HOSTS.get(p)
    if not allowed_hosts:
        raise ValueError("embed.provider not supported")

    if not _host_in(host, allowed_hosts):
        raise ValueError(f"embed.url host not allowed for provider '{p}'")

    # Minimal pattern tightening to avoid arbitrary endpoints.
    path = parsed.path or ""
    if p == "youtube":
        # Allow youtu.be/<id>, youtube.com/watch, youtube.com/embed/<id>
        if host == "youtu.be":
            if path.count("/") < 1 or len(path.strip("/")) < 5:
                raise ValueError("youtube embed url must look like https://youtu.be/<id>")
        else:
            if not (path.startswith("/watch") or path.startswith("/embed/")):
                raise ValueError("youtube embed url must use /watch or /embed/")
    elif p == "spotify":
        if not path.startswith("/embed/"):
            raise ValueError("spotify embed url must use /embed/")
    elif p == "vimeo":
        # player.vimeo.com/video/<id> OR vimeo.com/<id>
        if host == "player.vimeo.com":
            if not path.startswith("/video/"):
                raise ValueError("vimeo player url must use /video/<id>")
        else:
            if len(path.strip("/")) < 4:
                raise ValueError("vimeo url must include a video id")


def validate_widgets_json(value: Any) -> Dict[str, List[Dict]]:
    """Validate controlled widgets schema.

    Expected shape:
      {"widgets": [ {..widget..}, ... ]}
    """

    if value is None or value == "":
        return {"widgets": []}

    if not isinstance(value, dict):
        raise ValidationError.from_exception_data(
            title="widgets_json",
            line_errors=[{"type": "dict_type", "loc": ("widgets_json",), "input": value}],
        )

    widgets = value.get("widgets", [])
    if widgets is None:
        widgets = []

    if not isinstance(widgets, list):
        raise ValidationError.from_exception_data(
            title="widgets_json",
            line_errors=[{"type": "list_type", "loc": ("widgets",), "input": widgets}],
        )

    parsed: List[Dict] = []
    for w in widgets:
        widget_type = (w or {}).get("type") if isinstance(w, dict) else None
        if widget_type == "pull_quote":
            parsed.append(PullQuoteWidget.model_validate(w).model_dump())
        elif widget_type == "related_card":
            parsed.append(RelatedCardWidget.model_validate(w).model_dump())
        elif widget_type == "youtube":
            parsed.append(YouTubeWidget.model_validate(w).model_dump())
        elif widget_type == "gallery":
            gw = GalleryWidget.model_validate(w)
            # Avoid pathological payloads; keep PoC constraints simple.
            if len(gw.mediaIds) > 50:
                raise ValidationError.from_exception_data(
                    title="widgets_json",
                    line_errors=[
                        {
                            "type": "value_error",
                            "loc": ("widgets",),
                            "msg": "gallery.mediaIds cannot exceed 50",
                        }
                    ],
                )
            parsed.append(gw.model_dump())
        elif widget_type == "image":
            parsed.append(ImageWidget.model_validate(w).model_dump())
        elif widget_type == "embed":
            ew = EmbedWidget.model_validate(w)
            provider = (ew.provider or "").strip().lower()
            if provider not in _ALLOWED_EMBED_PROVIDERS:
                raise ValidationError.from_exception_data(
                    title="widgets_json",
                    line_errors=[
                        {
                            "type": "value_error",
                            "loc": ("widgets",),
                            "msg": f"embed.provider must be one of: {', '.join(sorted(_ALLOWED_EMBED_PROVIDERS))}",
                            "ctx": {"error": ValueError("embed.provider not allowed")},
                        }
                    ],
                )
            try:
                _validate_embed_url_for_provider(provider, ew.url)
            except ValueError as e:
                raise ValidationError.from_exception_data(
                    title="widgets_json",
                    line_errors=[
                        {
                            "type": "value_error",
                            "loc": ("widgets",),
                            "msg": str(e),
                            "ctx": {"error": e},
                        }
                    ],
                )
            parsed.append(ew.model_dump())
        elif widget_type == "callout":
            cw = CalloutWidget.model_validate(w)
            v = (cw.variant or "").strip().lower()
            if v not in _ALLOWED_CALLOUT_VARIANTS:
                raise ValidationError.from_exception_data(
                    title="widgets_json",
                    line_errors=[
                        {
                            "type": "value_error",
                            "loc": ("widgets",),
                            "msg": f"callout.variant must be one of: {', '.join(sorted(_ALLOWED_CALLOUT_VARIANTS))}",
                            "ctx": {"error": ValueError("callout.variant not allowed")},
                        }
                    ],
                )
            parsed.append(cw.model_dump())
        elif widget_type == "heading":
            parsed.append(HeadingWidget.model_validate(w).model_dump())
        elif widget_type == "divider":
            parsed.append(DividerWidget.model_validate(w).model_dump())

    return {"widgets": parsed}
