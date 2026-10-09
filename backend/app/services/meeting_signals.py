import re
import logging
from typing import Any

from app.core.ai import parse_ai_json

logger = logging.getLogger(__name__)


class MeetingSignalsService:
    def __init__(self, parent):
        """
        parent is an instance of SummarizerService.
        This design allows MeetingSignalsService to call helper methods like
        _create_completion, _format_transcript_with_segments, etc. on SummarizerService,
        ensuring 100% backward compatibility with existing tests that mock SummarizerService.
        """
        self.parent = parent

    def extract_structured_signals(self, transcript, memo, language="vi", segments=None):
        transcript_excerpt = self.parent._format_transcript_with_segments(transcript, segments)[:12000]
        memo_excerpt = memo[:9000]
        system_prompt = (
            "You are a senior BrSE meeting analyst. "
            "Extract structured meeting signals from the transcript and memo. "
            "Return only valid JSON without markdown fences."
        )
        if language == "ja":
            system_prompt += " Use Japanese text for the content values."
        elif language == "en":
            system_prompt += " Use English text for the content values."
        else:
            system_prompt += " Use Vietnamese text for the content values."

        user_prompt = (
            "Return this JSON shape:\n"
            "{\n"
            '  "summary": "short summary",\n'
            '  "short_summary": "3-5 bullet executive summary, concise but concrete",\n'
            '  "detailed_summary": "8-12 bullet detailed summary covering context, flow, decisions, concerns, and next steps",\n'
            '  "speakers": [{"label":"speaker label","role_hint":"role","highlights":["quote 1","quote 2"]}],\n'
            '  "decisions": ["decision 1"],\n'
            '  "actions": [{"task":"task","owner":"owner or empty","deadline":"YYYY-MM-DD or empty","status":"open"}],\n'
            '  "risks": ["risk 1"],\n'
            '  "open_questions": ["question 1"],\n'
            '  "keywords": ["term 1"]\n'
            "}\n\n"
            "Use only concrete facts from the transcript or memo. "
            "Do not invent owners or deadlines. Empty arrays are allowed. "
            "The detailed_summary should be richer than summary and useful for a BrSE who must report to a Japanese customer.\n\n"
            f"MEMO:\n{memo_excerpt}\n\n"
            f"TRANSCRIPT EXCERPT:\n{transcript_excerpt}"
        )

        try:
            raw = self.parent._create_completion(
                [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=1400,
            )
            if not raw.strip():
                raise RuntimeError("9Router returned empty structured signals.")
            parsed = parse_ai_json(raw, "Structured signal parse failed")
            normalized = self._normalize_structured_signals(parsed)
            normalized["source"] = "ai"
            if (
                normalized["short_summary"]
                or normalized["detailed_summary"]
                or normalized["decisions"]
                or normalized["actions"]
                or normalized["risks"]
                or normalized["speakers"]
            ):
                return normalized
        except Exception as exc:
            logger.warning(f"⚠️ Structured signal extraction fallback: {exc}")

        fallback = self._build_structured_signal_fallback(transcript, memo, segments)
        fallback["source"] = "fallback"
        return fallback

    def _normalize_structured_signals(self, data: dict[str, Any]):
        def normalize_string_list(value):
            if not isinstance(value, list):
                return []
            return self._dedupe_keep_order(
                [str(item).strip() for item in value if str(item).strip()]
            )[:8]

        speakers = []
        for item in data.get("speakers", []):
            if not isinstance(item, dict):
                continue
            label = str(item.get("label", "")).strip() or str(item.get("role_hint", "")).strip() or "Speaker"
            highlights = normalize_string_list(item.get("highlights", []))[:3]
            if label or highlights:
                speakers.append(
                    {
                        "label": label,
                        "role_hint": str(item.get("role_hint", "")).strip(),
                        "highlights": highlights,
                    }
                )

        actions = []
        for item in data.get("actions", []):
            if isinstance(item, str) and item.strip():
                actions.append({"task": item.strip(), "owner": "", "deadline": "", "status": "open"})
                continue
            if not isinstance(item, dict):
                continue
            task = str(item.get("task", "")).strip()
            if not task:
                continue
            actions.append(
                {
                    "task": task,
                    "owner": str(item.get("owner", "")).strip(),
                    "deadline": self._extract_deadline(str(item.get("deadline", "")).strip()),
                    "status": str(item.get("status", "")).strip() or "open",
                }
            )

        return {
            "summary": str(data.get("summary", "")).strip(),
            "short_summary": self._normalize_summary_text(data.get("short_summary") or data.get("summary") or ""),
            "detailed_summary": self._normalize_summary_text(data.get("detailed_summary") or data.get("summary") or ""),
            "speakers": speakers[:5],
            "decisions": normalize_string_list(data.get("decisions", [])),
            "actions": actions[:8],
            "risks": normalize_string_list(data.get("risks", [])),
            "open_questions": normalize_string_list(data.get("open_questions", [])),
            "keywords": normalize_string_list(data.get("keywords", [])),
        }

    def _build_structured_signal_fallback(self, transcript, memo, segments=None):
        combined = "\n".join(part for part in [memo, transcript] if part).strip()
        decisions = self._extract_candidate_lines(combined, [r"決定", r"合意", r"承認", r"方針", r"decision", r"decided"], 6)
        risks = self._extract_candidate_lines(combined, [r"課題", r"懸念", r"リスク", r"blocker", r"risk", r"issue"], 6)
        questions = self._extract_candidate_lines(combined, [r"確認", r"未回答", r"question", r"Q&A", r"相談"], 6)
        action_lines = self._extract_candidate_lines(combined, [r"action", r"todo", r"対応", r"担当", r"宿題", r"follow up", r"next"], 8)
        actions = [self._line_to_action(line) for line in action_lines]
        actions = [action for action in actions if action["task"]]

        speaker_groups = self._extract_speaker_groups(transcript, segments)
        keywords = self._dedupe_keep_order(self._extract_terms(memo or transcript))[:8]
        summary = self._extract_summary_text(memo)
        short_summary = self._extract_section_text(memo, ["Short Summary", "Summary", "概要", "要約"], 700)
        detailed_summary = self._extract_section_text(
            memo,
            ["Detailed Summary", "Conversation Flow", "詳細サマリー", "詳細", "議論内容"],
            1800,
        )
        if not summary:
            summary = "Meeting note was generated with local structured fallback from transcript and memo."
        if not short_summary:
            short_summary = summary
        if not detailed_summary:
            details = self._extract_local_bullets(transcript or memo, 12)
            detailed_summary = "\n".join(f"- {line}" for line in details) or summary

        return {
            "summary": summary,
            "short_summary": short_summary,
            "detailed_summary": detailed_summary,
            "speakers": speaker_groups,
            "decisions": decisions,
            "actions": actions,
            "risks": risks,
            "open_questions": questions,
            "keywords": keywords,
        }

    def _extract_speaker_groups(self, transcript, segments=None):
        speaker_map: dict[str, list[str]] = {}

        if segments:
            for segment in segments[:80]:
                text = (segment.get("text") or "").strip()
                if not text:
                    continue
                label = self.parent._infer_role_hint(text)
                entry = speaker_map.setdefault(label, [])
                quote = f"[{self.parent._seconds_label(float(segment.get('start', 0)))}] {text[:180]}"
                if quote not in entry and len(entry) < 3:
                    entry.append(quote)
        else:
            for raw_line in (transcript or "").splitlines():
                line = raw_line.strip()
                if ":" not in line or len(line) < 10:
                    continue
                left, right = line.split(":", 1)
                label = left.strip()[:40]
                text = right.strip()
                if not label or not text:
                    continue
                entry = speaker_map.setdefault(label, [])
                if text not in entry and len(entry) < 3:
                    entry.append(text[:180])

        return [
            {"label": label, "role_hint": label, "highlights": highlights}
            for label, highlights in list(speaker_map.items())[:5]
        ]

    def _extract_summary_text(self, memo: str):
        if not memo:
            return ""
        match = re.search(r"##\s*(Summary|概要)\s*(.+?)(?:\n##|\Z)", memo, flags=re.IGNORECASE | re.DOTALL)
        if not match:
            return ""
        text = re.sub(r"\s+", " ", match.group(2)).strip()
        return text[:320]

    def _extract_section_text(self, memo: str, headings: list[str], limit: int):
        if not memo:
            return ""
        escaped = "|".join(re.escape(heading) for heading in headings)
        match = re.search(rf"##+\s*(?:{escaped})\s*(.+?)(?:\n##|\Z)", memo, flags=re.IGNORECASE | re.DOTALL)
        if not match:
            return ""
        text = match.group(1).strip()
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text[:limit]

    def _normalize_summary_text(self, value: Any):
        if isinstance(value, list):
            return "\n".join(f"- {str(item).strip()}" for item in value if str(item).strip())
        return str(value or "").strip()

    def _extract_candidate_lines(self, text, patterns, limit):
        if not text:
            return []
        regex = re.compile("|".join(patterns), re.IGNORECASE)
        lines = []
        normalized = text.replace("。", ". ").replace("！", ". ").replace("？", ". ")
        for fragment in re.split(r"[\n\r]+|(?<=\.)\s+", normalized):
            line = fragment.strip(" -*\t")
            if len(line) < 10:
                continue
            if regex.search(line):
                lines.append(line[:220])
            if len(lines) >= limit:
                break
        return self._dedupe_keep_order(lines)

    def _line_to_action(self, line: str):
        owner = ""
        deadline = self._extract_deadline(line)
        owner_match = re.search(r"(?:owner|担当|担当者|người phụ trách)[:：]?\s*([A-Za-zÀ-ỹ0-9_.\- ]{2,40})", line, re.IGNORECASE)
        if owner_match:
            owner = owner_match.group(1).strip(" .,-")
        return {
            "task": line[:220],
            "owner": owner,
            "deadline": deadline,
            "status": "open",
        }

    def _extract_deadline(self, text: str):
        match = re.search(r"(20\d{2}-\d{2}-\d{2})", text)
        return match.group(1) if match else ""

    def _extract_terms(self, text: str):
        terms = []
        for raw in re.findall(r"\b[A-Z][A-Z0-9_-]{1,14}\b|\b[A-Za-z]+(?:API|UAT|CR|QA|JST|ICT)\b", text or ""):
            token = raw.strip()
            if len(token) >= 2:
                terms.append(token)
        return terms

    def _dedupe_keep_order(self, items):
        seen = set()
        deduped = []
        for item in items:
            if item in seen:
                continue
            seen.add(item)
            deduped.append(item)
        return deduped

    def _extract_local_bullets(self, text, limit):
        if not text:
            return []
        cleaned = " ".join(text.split())
        if not cleaned:
            return []

        normalized = cleaned.replace("。", ". ").replace("！", ". ").replace("？", ". ")
        candidates = []
        for fragment in normalized.split(". "):
            line = fragment.strip(" -\n\t")
            if len(line) < 24:
                continue
            candidates.append(line[:220])
            if len(candidates) >= limit:
                break
        return candidates

    def _to_bullets(self, items, empty_text):
        if not items:
            return f"- {empty_text}"
        return "\n".join(f"- {item}" for item in items if item)

    def _to_action_bullets(self, actions, empty_text):
        if not actions:
            return f"- {empty_text}"
        lines = []
        for action in actions:
            owner = f" | owner: {action['owner']}" if action.get("owner") else ""
            deadline = f" | deadline: {action['deadline']}" if action.get("deadline") else ""
            lines.append(f"- {action['task']}{owner}{deadline}")
        return "\n".join(lines)
