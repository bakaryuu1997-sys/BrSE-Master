"""Runtime settings, read from environment variables."""

from __future__ import annotations

import os
from collections.abc import Mapping
from dataclasses import dataclass

# Canonical API base of the project (docs/PROJECT_SOURCE_OF_TRUTH.md): the frontend proxy, never :8000.
DEFAULT_API_BASE = "http://127.0.0.1:3010/api"


@dataclass(frozen=True)
class Settings:
    api_base: str = DEFAULT_API_BASE
    api_secret: str = ""
    timeout_seconds: float = 30.0
    # Upper bound for a single text field returned by a "get one item" tool.
    max_chars: int = 20_000
    mode: str = "read"

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> Settings:
        env = os.environ if env is None else env
        mode = (env.get("BRSE_MCP_MODE") or "read").strip().lower()
        if mode != "read":
            # Writing is deliberately not implemented in phase 1; fail loudly instead of pretending.
            raise ValueError(f"BRSE_MCP_MODE={mode!r} is not supported yet: only 'read' is implemented.")
        return cls(
            api_base=(env.get("BRSE_API_BASE") or DEFAULT_API_BASE).rstrip("/"),
            api_secret=(env.get("BRSE_API_SECRET") or "").strip(),
            timeout_seconds=float(env.get("BRSE_MCP_TIMEOUT") or 30.0),
            max_chars=int(env.get("BRSE_MCP_MAX_CHARS") or 20_000),
            mode=mode,
        )
