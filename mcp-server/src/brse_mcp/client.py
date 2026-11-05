"""Thin async HTTP client for the BrSE OS REST API (always through the /api proxy)."""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import quote

import httpx

from .config import Settings

_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")


class BrseApiError(Exception):
    """An API call failed. `hint` tells the caller (an AI agent or a human) what to check."""

    def __init__(self, message: str, *, status: int | None = None, hint: str = "") -> None:
        super().__init__(message)
        self.status = status
        self.hint = hint

    def __str__(self) -> str:  # shown to the model, so keep it actionable
        base = super().__str__()
        return f"{base} Hint: {self.hint}" if self.hint else base


def safe_id(value: str, *, kind: str = "id") -> str:
    """Validate an identifier supplied by the model before it is placed in a URL path.

    Rejects anything that could change the route (`../`, `?`, `#`, slashes, spaces, empty).
    """
    text = str(value).strip()
    if not _ID_PATTERN.fullmatch(text) or ".." in text:
        raise BrseApiError(f"Invalid {kind}: {value!r}.", hint="Use the id exactly as returned by a list/search tool.")
    return text


def path_segment(value: str) -> str:
    """Percent-encode free text (e.g. a project name) for use as ONE path segment."""
    text = str(value).strip()
    if not text:
        raise BrseApiError("Empty path value.")
    return quote(text, safe="")


class BrseClient:
    def __init__(self, settings: Settings, transport: httpx.AsyncBaseTransport | None = None) -> None:
        headers = {"Accept": "application/json"}
        if settings.api_secret:
            headers["X-BrSE-Token"] = settings.api_secret
        self._settings = settings
        self._http = httpx.AsyncClient(
            base_url=settings.api_base,
            headers=headers,
            timeout=settings.timeout_seconds,
            # The Next.js proxy 308-redirects trailing-slash URLs.
            follow_redirects=True,
            transport=transport,
        )

    async def aclose(self) -> None:
        await self._http.aclose()

    async def get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        clean = {key: value for key, value in (params or {}).items() if value is not None and value != ""}
        try:
            response = await self._http.get(path, params=clean)
        except httpx.RequestError as exc:
            raise BrseApiError(
                f"Cannot reach BrSE OS at {self._settings.api_base} ({type(exc).__name__}).",
                hint="Is the stack running? Start it with `bash scripts/start-brse-stack.sh`, then check BRSE_API_BASE.",
            ) from exc

        if response.status_code == 401:
            raise BrseApiError(
                "BrSE OS rejected the request (401 Unauthorized).",
                status=401,
                hint="The server has BRSE_API_SECRET set: export the same value as BRSE_API_SECRET for this MCP server.",
            )
        if response.status_code == 404:
            raise BrseApiError(f"Not found: {path}.", status=404, hint="Check the id with the matching list/search tool.")
        if response.status_code >= 400:
            detail = _error_detail(response)
            raise BrseApiError(f"BrSE OS returned HTTP {response.status_code}: {detail}", status=response.status_code)
        try:
            return response.json()
        except ValueError as exc:
            raise BrseApiError("BrSE OS returned a non-JSON response.", status=response.status_code) from exc


def _error_detail(response: httpx.Response) -> str:
    try:
        data = response.json()
    except ValueError:
        return response.text[:200]
    detail = data.get("detail") if isinstance(data, dict) else data
    return str(detail)[:300]
