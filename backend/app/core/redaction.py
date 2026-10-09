from __future__ import annotations

import re
from collections.abc import Iterable


DATA_URL_RE = re.compile(r"data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=\s]{32,}", re.IGNORECASE)
BEARER_RE = re.compile(r"\bBearer\s+[A-Za-z0-9._~+/=-]{6,}", re.IGNORECASE)
KEY_VALUE_RE = re.compile(
    r"(?P<key>\b(?:api[_-]?key|authorization|password|secret|token|x-brse-token)\b)"
    r"(?P<sep>\s*[:=]\s*[\"']?)"
    r"(?P<value>[^\"'\s,;}]+)",
    re.IGNORECASE,
)
JSON_CONTENT_RE = re.compile(
    r"(?P<prefix>[\"'](?:content|message|prompt|base64_image|text)[\"']\s*:\s*[\"'])"
    r"(?P<value>.*?)(?P<suffix>[\"']\s*(?:[,}]))",
    re.IGNORECASE | re.DOTALL,
)


def redact_sensitive_text(value: object, *, extra_secrets: Iterable[str] = (), max_length: int = 500) -> str:
    text = str(value)
    text = DATA_URL_RE.sub("[REDACTED_IMAGE_DATA]", text)
    text = BEARER_RE.sub("Bearer [REDACTED]", text)
    text = KEY_VALUE_RE.sub(lambda m: f"{m.group('key')}{m.group('sep')}[REDACTED]", text)
    text = JSON_CONTENT_RE.sub(lambda m: f"{m.group('prefix')}[REDACTED_CONTENT]{m.group('suffix')}", text)

    for secret in extra_secrets:
        cleaned = str(secret or "").strip()
        if len(cleaned) >= 6:
            text = text.replace(cleaned, "[REDACTED]")

    if len(text) > max_length:
        return f"{text[:max_length].rstrip()}... [truncated]"
    return text
