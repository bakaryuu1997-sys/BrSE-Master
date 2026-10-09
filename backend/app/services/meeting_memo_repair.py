import re
from typing import Any


def markdown_bullets(value: Any) -> list[str]:
    if isinstance(value, list):
        values = value
    else:
        values = str(value or "").splitlines()
    bullets: list[str] = []
    for item in values:
        if isinstance(item, dict):
            task = str(item.get("task") or item.get("content") or "").strip()
            owner = str(item.get("owner") or "").strip()
            deadline = str(item.get("deadline") or "").strip()
            status = str(item.get("status") or "").strip()
            suffix = " ".join(
                part
                for part in [
                    f"Owner: {owner}" if owner else "",
                    f"Due: {deadline}" if deadline else "",
                    f"Status: {status}" if status else "",
                ]
                if part
            )
            text = f"{task} ({suffix})" if suffix else task
        else:
            text = str(item).strip()
        while re.match(r"^\s*[-*]\s+", text):
            text = re.sub(r"^\s*[-*]\s+", "", text).strip()
        if text:
            bullets.append(text)
    return bullets


WEAK_MEMO_MARKERS = [
    "local structured fallback",
    "Synthesize them into one complete Meeting Note",
    "Below are consolidated summaries of a long meeting",
    "## Source Excerpt",
]


def memo_needs_analysis_repair(content: str, analysis: dict[str, Any]) -> bool:
    if not analysis:
        return False
    detailed = str(analysis.get("detailed_summary") or "").strip()
    useful_analysis = len(detailed.split()) >= 80 or bool(analysis.get("actions") or analysis.get("decisions"))
    if not useful_analysis:
        return False
    return any(marker in content for marker in WEAK_MEMO_MARKERS)


def build_analysis_backed_memo(title: str, content: str, analysis: dict[str, Any]) -> str:
    sections: list[str] = [f"# {title or 'Meeting Note'}", ""]
    summary = str(analysis.get("summary") or "").strip()
    short_summary = analysis.get("short_summary") or summary
    detailed_summary = analysis.get("detailed_summary") or summary

    def add_section(heading: str, value: Any):
        bullets = markdown_bullets(value)
        if not bullets:
            return
        sections.extend([f"## {heading}", ""])
        sections.extend(f"- {item}" for item in bullets)
        sections.append("")

    add_section("Short Summary", short_summary)
    add_section("Detailed Summary", detailed_summary)

    speakers = analysis.get("speakers") if isinstance(analysis.get("speakers"), list) else []
    if speakers:
        sections.extend(["## Speakers", ""])
        for speaker in speakers:
            if not isinstance(speaker, dict):
                continue
            label = str(speaker.get("label") or "Speaker").strip()
            role = str(speaker.get("role_hint") or "").strip()
            header = f"- **{label}**" + (f" - {role}" if role else "")
            highlights = markdown_bullets(speaker.get("highlights"))
            if highlights:
                sections.append(header)
                sections.extend(f"  - {item}" for item in highlights)
            else:
                sections.append(header)
        sections.append("")

    add_section("Key Decisions", analysis.get("decisions"))
    add_section("Action Items", analysis.get("actions"))
    add_section("Risks", analysis.get("risks"))
    add_section("Open Questions", analysis.get("open_questions"))
    add_section("Keywords", analysis.get("keywords"))

    if content.strip() and len(content.split()) >= 120 and not any(marker in content for marker in WEAK_MEMO_MARKERS):
        sections.extend(["## Original Memo / Recovery Source", "", content.strip()])

    return "\n".join(sections).strip() + "\n"
