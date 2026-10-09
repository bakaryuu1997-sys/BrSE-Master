#!/usr/bin/env python3
from __future__ import annotations

import os
import logging
import statistics
import sys
import tempfile
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))


def percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = min(len(ordered) - 1, max(0, round((pct / 100) * (len(ordered) - 1))))
    return ordered[index]


def main() -> int:
    with tempfile.NamedTemporaryFile(prefix="brse-latency-", suffix=".db", delete=False) as db_file:
        db_path = Path(db_file.name)

    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"
    logging.disable(logging.CRITICAL)
    logging.getLogger("app.main").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)

    from fastapi.testclient import TestClient

    from app.core.config import settings
    from app.main import app

    settings.brse_api_secret = ""
    client = TestClient(app)
    endpoints = [
        ("health", "GET", "/api/health"),
        ("command_center_dashboard", "GET", "/api/command-center"),
        ("command_center_drafts", "GET", "/api/command-center/meeting-action-drafts"),
        ("command_center_sync_meeting_actions", "POST", "/api/command-center/sync-meeting-actions"),
        ("operations_list", "GET", "/api/operations"),
        ("reports_list", "GET", "/api/reports/"),
        ("todo_projects", "GET", "/api/todos/projects"),
        ("client_state_read", "GET", "/api/client-state/entry/brse.latency.smoke"),
    ]
    rounds = int(os.environ.get("BRSE_LATENCY_ROUNDS", "7"))
    failures: list[str] = []
    print("BrSE local backend latency smoke")
    print(f"rounds={rounds} database={db_path}")
    for name, method, path in endpoints:
        timings: list[float] = []
        statuses: list[int] = []
        for _ in range(rounds):
            started = time.perf_counter()
            response = client.request(method, path)
            timings.append((time.perf_counter() - started) * 1000)
            statuses.append(response.status_code)
        p50 = statistics.median(timings)
        p95 = percentile(timings, 95)
        status_set = ",".join(str(status) for status in sorted(set(statuses)))
        print(f"{name}: status={status_set} p50={p50:.1f}ms p95={p95:.1f}ms")
        if any(status >= 500 for status in statuses):
            failures.append(f"{name} returned server error status {status_set}")
        if p95 > 1500:
            failures.append(f"{name} p95 {p95:.1f}ms exceeds 1500ms")

    try:
        db_path.unlink(missing_ok=True)
    except OSError:
        pass

    if failures:
        print("Latency smoke failed:")
        for failure in failures:
            print(f"- {failure}")
        return 1
    print("Latency smoke passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
