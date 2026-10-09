"""
Lightweight Keigo / business-Japanese heuristics when AI (9Router) is unavailable.
Returns the same top-level keys as generate_keigo_correction for API compatibility.
"""

from __future__ import annotations

import re
from typing import Any

_RULES: list[tuple[re.Pattern[str], str, str]] = [
    (
        re.compile(r"\bいたします\b"),
        "致します",
        "Với khách/trình trọng: 致します (kanji 致) thường được ưa hơn いたします trong một số template SIer.",
    ),
]


def local_keigo_fallback(text: str) -> dict[str, Any]:
    original = text.strip()
    if not original:
        return {
            "level": "不明",
            "score": 0,
            "improved": "",
            "changes": [],
            "summary_vi": "Nội dung trống.",
            "error": "empty",
        }

    improved = original
    changes: list[dict[str, str]] = []
    for pattern, replacement, reason in _RULES:
        if pattern.search(improved):
            m = pattern.search(improved)
            frag = m.group(0) if m else ""
            improved = pattern.sub(replacement, improved, count=1)
            changes.append({"original": frag, "corrected": replacement, "reason_vi": reason})

    if re.search(r"[\s　]だ[。、\s]|である", improved):
        changes.append(
            {
                "original": "だ／である調",
                "corrected": "です／ます調",
                "reason_vi": "Email khách hàng thường tránh である体 — nên xem lại và chuyển sang ですます.",
            }
        )

    score = 88 if not changes else max(55, 90 - min(30, len(changes) * 8))
    summary = (
        "Bản offline: đã quét vài mẫu keigo/hình thức thường gặp. Kết nối lại AI để kiểm tra sâu hơn."
        if changes
        else "Bản offline: không bắt được mẫu từ điển nhanh. Chạy lại AI khi 9Router sẵn sàng."
    )
    return {
        "level": "敬語（オフライン辞書）",
        "score": score,
        "improved": improved if changes else original,
        "changes": changes[:12],
        "summary_vi": summary,
        "source": "local_rule_engine",
    }
