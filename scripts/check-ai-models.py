#!/usr/bin/env python3
"""Smoke-test curated BrSE AI models through the local backend API."""

from __future__ import annotations

import sys
import urllib.error
import urllib.request
import os


API_BASE = os.environ.get("BRSE_API_BASE", "http://127.0.0.1:3010/api").rstrip("/")


def post_json(path: str, payload: bytes = b"{}", timeout: int = 180) -> tuple[int, str]:
    request = urllib.request.Request(
        f"{API_BASE}{path}",
        data=payload,
        headers={"content-type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode("utf-8", errors="replace")
    except urllib.error.URLError as exc:
        return 0, str(exc.reason)


def main() -> int:
    status, body = post_json("/ai/model-smoke")
    if status != 200:
        print(f"AI model smoke endpoint failed status={status}")
        print(body[:500])
        return 1

    import json

    payload = json.loads(body)
    results = payload.get("results", [])

    print("BrSE AI model smoke via backend /api/ai/chat")
    for item in results:
        marker = "PASS" if item["ok"] else "FAIL"
        print(f"{marker} {item['id']} status={item['status']} elapsed_ms={item['elapsed_ms']}")
        if not item["ok"]:
            print(f"  detail={item.get('error', '')}")

    failures = [item for item in results if not item["ok"]]
    if failures:
        print(f"{len(failures)} model(s) are currently red. API endpoint itself is reachable.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
