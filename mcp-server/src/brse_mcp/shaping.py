"""Keep tool results small and predictable for the model's context window."""

from __future__ import annotations

from typing import Any

LIST_PREVIEW_CHARS = 300
MAX_LIMIT = 100


def clip(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return f"{text[:limit]}… [truncated {len(text) - limit} chars]"


def clip_deep(value: Any, limit: int) -> Any:
    """Return a copy of `value` where every string longer than `limit` is cut."""
    if isinstance(value, str):
        return clip(value, limit)
    if isinstance(value, list):
        return [clip_deep(item, limit) for item in value]
    if isinstance(value, dict):
        return {key: clip_deep(item, limit) for key, item in value.items()}
    return value


def as_items(data: Any) -> list[Any]:
    """Normalise the shapes the API uses for collections: a bare list or {"items": [...]}."""
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and isinstance(data.get("items"), list):
        return data["items"]
    return [] if data is None else [data]


def clamp_limit(limit: int, default: int = 50) -> int:
    try:
        number = int(limit)
    except (TypeError, ValueError):
        return default
    return max(1, min(MAX_LIMIT, number))


def contains(item: Any, needle: str, fields: tuple[str, ...] | None = None) -> bool:
    """Case-insensitive substring match against selected fields (or every string field)."""
    needle = needle.strip().lower()
    if not needle:
        return True
    if not isinstance(item, dict):
        return needle in str(item).lower()
    keys = fields if fields is not None else tuple(item.keys())
    return any(needle in str(item.get(key, "")).lower() for key in keys)


def list_result(items: list[Any], *, limit: int, offset: int = 0, total: int | None = None) -> dict[str, Any]:
    """Standard envelope for list/search tools: previews only, with paging info."""
    window = items[offset : offset + limit]
    return {
        "total": len(items) if total is None else total,
        "returned": len(window),
        "offset": offset,
        "has_more": offset + len(window) < (len(items) if total is None else total),
        "items": [clip_deep(item, LIST_PREVIEW_CHARS) for item in window],
        "note": "Text fields are previews (cut at 300 chars); use the matching get_* tool for the full item.",
    }
