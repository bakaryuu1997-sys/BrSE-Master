import os
import re

from app.core.ai import create_chat_completion
from app.core.config import settings
from app.services.meeting_transcription import correct_transcript_terms


TRANSLATION_LANGUAGES = {
    "vi": "Vietnamese",
    "ja": "Japanese",
    "en": "English",
}

SRT_TIMESTAMP_PATTERN = re.compile(r"^\d{2}:\d{2}:\d{2},\d{3}\s+-->\s+\d{2}:\d{2}:\d{2},\d{3}")


def normalize_translation_language(value: str | None) -> str:
    normalized = (value or "vi").strip().lower()
    if normalized in {"vn", "vietnamese", "tieng-viet", "tiếng việt"}:
        return "vi"
    if normalized in {"jp", "japanese", "nihongo", "日本語"}:
        return "ja"
    if normalized in {"english", "eng"}:
        return "en"
    if normalized not in TRANSLATION_LANGUAGES:
        return "vi"
    return normalized


def translated_transcript_path(job_id: str, target_language: str = "vi") -> str:
    lang = normalize_translation_language(target_language)
    return os.path.join(settings.transcript_folder, f"{job_id}.translated.{lang}.txt")


def translated_srt_path(job_id: str, target_language: str = "vi") -> str:
    lang = normalize_translation_language(target_language)
    return os.path.join(settings.transcript_folder, f"{job_id}.translated.{lang}.srt")


def translation_artifact_languages(job_id: str) -> list[str]:
    languages: list[str] = []
    for lang in TRANSLATION_LANGUAGES:
        if os.path.exists(translated_transcript_path(job_id, lang)) or os.path.exists(translated_srt_path(job_id, lang)):
            languages.append(lang)
    return languages


def reclean_srt_terms(srt_text: str, glossary_terms: list[dict] | None = None) -> str:
    corrected_lines = []
    for line in srt_text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.isdigit() or SRT_TIMESTAMP_PATTERN.match(stripped):
            corrected_lines.append(line)
            continue
        corrected_lines.append(correct_transcript_terms(line, glossary_terms))
    suffix = "\n" if srt_text.endswith("\n") else ""
    return "\n".join(corrected_lines) + suffix


def _glossary_context(glossary_terms: list[dict] | None) -> str:
    rows = []
    for term in (glossary_terms or [])[:160]:
        english = str(term.get("english") or "").strip()
        japanese = str(term.get("japanese") or "").strip()
        vietnamese = str(term.get("vietnamese") or "").strip()
        if not any([english, japanese, vietnamese]):
            continue
        rows.append(f"- EN: {english or 'N/A'} | JA: {japanese or 'N/A'} | VI: {vietnamese or 'N/A'}")
    return "\n".join(rows)


def _split_text(text: str, max_chars: int = 6500) -> list[str]:
    paragraphs = re.split(r"(\n{2,})", text)
    chunks: list[str] = []
    current = ""
    for part in paragraphs:
        if not part:
            continue
        if current and len(current) + len(part) > max_chars:
            chunks.append(current.strip())
            current = part
        else:
            current += part
    if current.strip():
        chunks.append(current.strip())
    if chunks:
        return chunks
    return [text[i : i + max_chars] for i in range(0, len(text), max_chars) if text[i : i + max_chars].strip()]


def _split_srt_blocks(srt_text: str, max_chars: int = 7000) -> list[str]:
    blocks = re.split(r"\n\s*\n", srt_text.strip())
    chunks: list[str] = []
    current: list[str] = []
    current_len = 0
    for block in blocks:
        block = block.strip()
        if not block:
            continue
        next_len = current_len + len(block) + 2
        if current and next_len > max_chars:
            chunks.append("\n\n".join(current))
            current = [block]
            current_len = len(block)
        else:
            current.append(block)
            current_len = next_len
    if current:
        chunks.append("\n\n".join(current))
    return chunks


def _clean_ai_text(raw: str) -> str:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.removeprefix("```text").removeprefix("```srt").removeprefix("```").strip()
    if cleaned.endswith("```"):
        cleaned = cleaned.removesuffix("```").strip()
    return cleaned


async def translate_transcript_text(
    transcript: str,
    target_language: str,
    glossary_terms: list[dict] | None = None,
    model: str | None = None,
) -> str:
    lang = normalize_translation_language(target_language)
    language_name = TRANSLATION_LANGUAGES[lang]
    glossary = _glossary_context(glossary_terms)
    system_prompt = (
        "You are a precise BrSE transcript translator.\n"
        f"Translate the transcript into {language_name}.\n"
        "Preserve meaning, speaker intent, numbers, dates, task names, API names, UI labels, filenames, and product names.\n"
        "Use glossary terms as canonical terminology. Do not summarize, omit, add commentary, or wrap in markdown.\n"
        "If the source is mixed Vietnamese/Japanese/English, translate naturally while preserving technical terms."
    )
    if glossary:
        system_prompt += f"\n\nProject glossary:\n{glossary}"

    translated_chunks = []
    for index, chunk in enumerate(_split_text(transcript), start=1):
        raw = await create_chat_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Chunk {index}. Return only translated transcript text:\n\n{chunk}"},
            ],
            temperature=0.1,
            max_tokens=4200,
            model=model,
        )
        translated_chunks.append(_clean_ai_text(raw))
    return "\n\n".join(part for part in translated_chunks if part).strip()


async def translate_srt_text(
    srt_text: str,
    target_language: str,
    glossary_terms: list[dict] | None = None,
    model: str | None = None,
) -> str:
    lang = normalize_translation_language(target_language)
    language_name = TRANSLATION_LANGUAGES[lang]
    glossary = _glossary_context(glossary_terms)
    system_prompt = (
        "You are a precise subtitle translator for BrSE technical videos.\n"
        f"Translate subtitle text into {language_name}.\n"
        "Keep every SRT index line and timestamp line exactly unchanged.\n"
        "Translate only subtitle text lines. Preserve SRT block order and blank lines.\n"
        "Do not summarize, merge, split, add comments, or wrap in markdown."
    )
    if glossary:
        system_prompt += f"\n\nProject glossary:\n{glossary}"

    translated_chunks = []
    for index, chunk in enumerate(_split_srt_blocks(srt_text), start=1):
        raw = await create_chat_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"SRT chunk {index}. Return only valid SRT:\n\n{chunk}"},
            ],
            temperature=0.1,
            max_tokens=5200,
            model=model,
        )
        translated_chunks.append(_clean_ai_text(raw))
    return "\n\n".join(part for part in translated_chunks if part).strip() + "\n"


async def save_translated_artifacts(
    job_id: str,
    transcript: str,
    target_language: str,
    glossary_terms: list[dict] | None = None,
    *,
    srt_text: str | None = None,
    model: str | None = None,
) -> tuple[str, str | None, int]:
    lang = normalize_translation_language(target_language)
    os.makedirs(settings.transcript_folder, exist_ok=True)
    cleaned_transcript = correct_transcript_terms(transcript, glossary_terms)
    translated = await translate_transcript_text(cleaned_transcript, lang, glossary_terms, model=model)
    transcript_path = translated_transcript_path(job_id, lang)
    with open(transcript_path, "w", encoding="utf-8") as handle:
        handle.write(translated)
        if translated and not translated.endswith("\n"):
            handle.write("\n")

    srt_path: str | None = None
    if srt_text:
        cleaned_srt = reclean_srt_terms(srt_text, glossary_terms)
        translated_srt = await translate_srt_text(cleaned_srt, lang, glossary_terms, model=model)
        srt_path = translated_srt_path(job_id, lang)
        with open(srt_path, "w", encoding="utf-8") as handle:
            handle.write(translated_srt)

    return transcript_path, srt_path, len(translated)
