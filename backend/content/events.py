from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class EventKind:
    PAGEVIEW: str = "pageview"
    READ: str = "read"
