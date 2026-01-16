from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, ValidationError


class PullQuoteWidget(BaseModel):
    type: str = Field(pattern="^pull_quote$")
    text: str
    attribution: Optional[str] = None


class RelatedCardWidget(BaseModel):
    type: str = Field(pattern="^related_card$")
    articleId: int


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
        else:
            raise ValidationError.from_exception_data(
                title="widgets_json",
                line_errors=[
                    {"type": "value_error", "loc": ("widgets",), "msg": f"Unknown widget type: {widget_type}"}
                ],
            )

    return {"widgets": parsed}
