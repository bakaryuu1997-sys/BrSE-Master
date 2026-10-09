from __future__ import annotations

from collections import Counter
from datetime import date
from typing import Any


BRSE_TODO_PHASE_ORDER = [
    "1. Kick-off & Requirement",
    "2. Communication Setup",
    "3. Requirement Analysis",
    "4. Tracking & Reporting",
    "5. Q&A & Change",
    "6. Testing & UAT",
    "7. Closure & Knowledge",
]


def phase_rank(phase: str) -> int:
    try:
        return BRSE_TODO_PHASE_ORDER.index(phase)
    except ValueError:
        return len(BRSE_TODO_PHASE_ORDER)


def priority_rank(priority: str) -> int:
    normalized = (priority or "P1").upper()
    if normalized == "P0":
        return 0
    if normalized == "P1":
        return 1
    return 2


def normalize_priority(priority: str) -> str:
    normalized = (priority or "P1").upper()
    return normalized if normalized in {"P0", "P1", "P2"} else "P1"


def parse_iso_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def todo_item_to_rule_dict(item: Any) -> dict[str, Any]:
    return {
        "id": getattr(item, "id", ""),
        "project_id": getattr(item, "project_id", ""),
        "phase": getattr(item, "phase", ""),
        "title": getattr(item, "title", ""),
        "detail": getattr(item, "detail", "") or "",
        "priority": getattr(item, "priority", "P1") or "P1",
        "done": bool(getattr(item, "done", False)),
        "deadline": getattr(item, "deadline", "") or "",
        "source": getattr(item, "source", "workflow") or "workflow",
        "operation_id": getattr(item, "operation_id", "") or "",
        "meeting_id": getattr(item, "meeting_id", "") or "",
        "meeting_title": getattr(item, "meeting_title", "") or "",
    }


def evaluate_todo_rules(items: list[dict[str, Any]], today: str | None = None) -> dict[str, Any]:
    today_date = parse_iso_date(today) or date.today()
    today_iso = today_date.isoformat()
    open_items: list[dict[str, Any]] = []
    done_count = 0
    overdue_count = 0
    due_today_count = 0
    p0_count = 0
    by_phase: Counter[str] = Counter()

    for item in items:
        normalized_priority = normalize_priority(str(item.get("priority") or "P1"))
        phase = str(item.get("phase") or "Unsorted")
        by_phase[phase] += 1
        if bool(item.get("done")):
            done_count += 1
            continue

        deadline_date = parse_iso_date(str(item.get("deadline") or ""))
        is_overdue = deadline_date is not None and deadline_date < today_date
        is_due_today = deadline_date == today_date
        computed_priority = "P0" if is_overdue or is_due_today or normalized_priority == "P0" else normalized_priority
        if is_overdue:
            overdue_count += 1
        if is_due_today:
            due_today_count += 1
        if computed_priority == "P0":
            p0_count += 1

        reasons: list[str] = []
        if is_overdue:
            reasons.append("overdue")
        elif is_due_today:
            reasons.append("due_today")
        if normalized_priority == "P0":
            reasons.append("priority_p0")
        if item.get("operation_id"):
            reasons.append("operation_linked")
        if item.get("meeting_id"):
            reasons.append("meeting_action")
        if not reasons:
            reasons.append("next_by_phase")

        urgency_score = (
            priority_rank(computed_priority) * 100
            + phase_rank(phase) * 10
            + (0 if is_overdue else 2 if is_due_today else 6)
        )
        open_items.append(
            {
                **item,
                "priority": normalized_priority,
                "computed_priority": computed_priority,
                "risk": "overdue" if is_overdue else "due_today" if is_due_today else "normal",
                "reasons": reasons,
                "sort_score": urgency_score,
            }
        )

    open_items.sort(
        key=lambda item: (
            item["sort_score"],
            str(item.get("deadline") or "9999-12-31"),
            str(item.get("title") or ""),
        )
    )

    recommendations: list[dict[str, str]] = []
    if overdue_count:
        recommendations.append(
            {
                "type": "risk",
                "title": "Xử lý todo quá hạn",
                "detail": f"{overdue_count} todo đã quá hạn so với {today_iso}.",
            }
        )
    if due_today_count:
        recommendations.append(
            {
                "type": "today",
                "title": "Chốt việc đến hạn hôm nay",
                "detail": f"{due_today_count} todo cần xử lý trong ngày {today_iso}.",
            }
        )
    if not recommendations and open_items:
        recommendations.append(
            {
                "type": "focus",
                "title": "Tiếp tục theo phase sớm nhất",
                "detail": "Không có deadline nóng; ưu tiên item P0/P1 ở phase hiện tại.",
            }
        )

    return {
        "today": today_iso,
        "stats": {
            "total": len(items),
            "open": len(open_items),
            "done": done_count,
            "overdue": overdue_count,
            "due_today": due_today_count,
            "p0": p0_count,
            "by_phase": dict(by_phase),
        },
        "next_focus": open_items[:8],
        "recommendations": recommendations,
    }
