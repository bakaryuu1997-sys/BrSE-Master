import re
import hashlib
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Callable

import httpx

from app.core.ai import _decode_chat_completion_response, parse_ai_json
from app.core.ai_http import get_ai_sync_client
from app.core.ai_runtime import get_selected_ai_model
from app.core.config import settings
from app.db.session import SessionLocal
from app.models.glossary import GlossaryTerm
from app.services.meeting_prompts import SYSTEM_PROMPTS
from app.services.meeting_signals import MeetingSignalsService


logger = logging.getLogger(__name__)


ProgressCallback = Callable[[str, int, dict[str, Any]], None]
CheckpointCallback = Callable[[dict[str, Any]], None]


class SummarizerService:
    def __init__(self, api_key=None, base_url=None, model=None):
        self.api_key = api_key or settings.nine_router_api_key or settings.openai_api_key
        self.base_url = (base_url or settings.openai_base_url or settings.nine_router_base_url).rstrip("/")
        self.model = model or get_selected_ai_model()
        self.signals_service = MeetingSignalsService(self)
        # Glossary terms are fetched once per service instance (one per summarize
        # request) instead of re-querying the whole table for every chunk.
        self._glossary_terms_cache: list[tuple[str, str, str]] | None = None

    def summarize(
        self,
        transcript,
        language="vi",
        template="meeting",
        segments=None,
        progress_callback: ProgressCallback | None = None,
        checkpoint: dict[str, Any] | None = None,
        checkpoint_callback: CheckpointCallback | None = None,
    ):
        """
        Summarize transcript with speaker cue support if segments are provided.
        """
        content_to_process = self._format_transcript_with_segments(transcript, segments)
        words = content_to_process.split()
        if len(words) > 2600:
            logger.info(f"📦 Long transcript ({len(words)} words), using Map-Reduce strategy...")
            return self._summarize_long_content(
                content_to_process,
                language,
                template,
                progress_callback,
                checkpoint=checkpoint,
                checkpoint_callback=checkpoint_callback,
            )

        self._notify_progress(progress_callback, "summarizing", 72, mode="single")
        memo = self._execute_summarize(content_to_process, language, template)
        self._notify_progress(progress_callback, "summarizing", 90, mode="single", completed=1, total=1)
        return memo

    def extract_structured_signals(self, transcript, memo, language="vi", segments=None):
        return self.signals_service.extract_structured_signals(transcript, memo, language, segments)

    def _summarize_long_content(
        self,
        content,
        language,
        template,
        progress_callback: ProgressCallback | None = None,
        checkpoint: dict[str, Any] | None = None,
        checkpoint_callback: CheckpointCallback | None = None,
    ):
        chunks = self._chunk_content(content, 1600)
        total_chunks = len(chunks)
        checkpoint_payload = self._prepare_summary_checkpoint(checkpoint, content, language, template, 1600, total_chunks)
        if checkpoint_payload.get("final_memo"):
            self._notify_progress(
                progress_callback,
                "summarizing",
                90,
                total=total_chunks,
                completed=total_chunks,
                reused=total_chunks,
                mode="checkpoint-final",
            )
            return str(checkpoint_payload["final_memo"])

        checkpoint_chunks = checkpoint_payload.setdefault("chunks", {})
        reused_count = len([value for value in checkpoint_chunks.values() if isinstance(value, str) and value.strip()])
        self._notify_progress(
            progress_callback,
            "summarizing",
            58,
            total=total_chunks,
            completed=reused_count,
            reused=reused_count,
        )

        max_workers = max(1, min(int(settings.meeting_summary_chunk_workers), total_chunks))
        if max_workers == 1 or total_chunks <= 1:
            summaries = []
            for index, chunk in enumerate(chunks):
                cached_summary = checkpoint_chunks.get(str(index))
                if isinstance(cached_summary, str) and cached_summary.strip():
                    logger.info(f"↻ Reusing checkpointed summary chunk {index + 1}/{total_chunks}.")
                    summary = cached_summary
                else:
                    logger.info(f"⏳ Summarizing chunk {index + 1}/{total_chunks}...")
                    summary = self._summarize_chunk_with_retry(chunk, language, template, index + 1, total_chunks)
                    checkpoint_chunks[str(index)] = summary
                    self._publish_summary_checkpoint(checkpoint_payload, checkpoint_callback)
                summaries.append(summary)
                percent = 58 + round(((index + 1) / max(total_chunks, 1)) * 20)
                self._notify_progress(
                    progress_callback,
                    "summarizing",
                    percent,
                    total=total_chunks,
                    completed=index + 1,
                    reused=reused_count,
                )
        else:
            logger.info(f"⚡ Parallel summary map: {total_chunks} chunks, {max_workers} workers")
            summaries = [""] * total_chunks
            completed = 0
            pending_chunks = []
            for index, chunk in enumerate(chunks):
                cached_summary = checkpoint_chunks.get(str(index))
                if isinstance(cached_summary, str) and cached_summary.strip():
                    summaries[index] = cached_summary
                    completed += 1
                else:
                    pending_chunks.append((index, chunk))
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = {
                    executor.submit(self._summarize_chunk_with_retry, chunk, language, template, index + 1, total_chunks): index
                    for index, chunk in pending_chunks
                }
                for future in as_completed(futures):
                    index = futures[future]
                    try:
                        summaries[index] = future.result()
                    except Exception as exc:
                        logger.warning(f"⚠️ Chunk {index + 1}/{total_chunks} summarize crashed, using local fallback: {exc}")
                        summaries[index] = self._local_chunk_summary(chunks[index], index + 1, total_chunks)
                    checkpoint_chunks[str(index)] = summaries[index]
                    self._publish_summary_checkpoint(checkpoint_payload, checkpoint_callback)
                    completed += 1
                    percent = 58 + round((completed / max(total_chunks, 1)) * 20)
                    self._notify_progress(
                        progress_callback,
                        "summarizing",
                        percent,
                        total=total_chunks,
                        completed=completed,
                        reused=reused_count,
                    )

        memo = self._reduce_chunk_summaries(summaries, language, template, progress_callback)
        checkpoint_payload["final_memo"] = memo
        self._publish_summary_checkpoint(checkpoint_payload, checkpoint_callback)
        return memo

    def _summary_checkpoint_key(self, content: str, language: str, template: str, chunk_size: int, total_chunks: int) -> str:
        payload = f"{language}\n{template}\n{chunk_size}\n{total_chunks}\n{content}".encode("utf-8")
        return hashlib.sha256(payload).hexdigest()

    def _prepare_summary_checkpoint(
        self,
        checkpoint: dict[str, Any] | None,
        content: str,
        language: str,
        template: str,
        chunk_size: int,
        total_chunks: int,
    ) -> dict[str, Any]:
        checkpoint_key = self._summary_checkpoint_key(content, language, template, chunk_size, total_chunks)
        if not isinstance(checkpoint, dict) or checkpoint.get("key") != checkpoint_key:
            return {
                "version": 1,
                "key": checkpoint_key,
                "language": language,
                "template": template,
                "chunk_size": chunk_size,
                "total_chunks": total_chunks,
                "chunks": {},
            }
        checkpoint.setdefault("chunks", {})
        checkpoint["total_chunks"] = total_chunks
        return checkpoint

    def _publish_summary_checkpoint(
        self,
        checkpoint_payload: dict[str, Any],
        checkpoint_callback: CheckpointCallback | None,
    ) -> None:
        if checkpoint_callback:
            checkpoint_callback(checkpoint_payload)

    def _chunk_content(self, content, chunk_size):
        words = content.split()
        return [" ".join(words[index:index + chunk_size]) for index in range(0, len(words), chunk_size)]

    def _summarize_chunk(self, chunk, language, template, chunk_index, total_chunks):
        system_prompt = (
            "You are a senior BrSE meeting analyst. Summarize only this one meeting chunk. "
            "Keep concrete facts, owners, deadlines, decisions, blockers, risks, and customer asks. "
            "Use concise Markdown bullets. Do not invent missing context."
        )
        if language == "dual":
            system_prompt += " Write in bilingual Vietnamese - Japanese."
        elif language == "ja":
            system_prompt += " Write in Japanese."
        else:
            system_prompt += " Write in Vietnamese."

        user_prompt = (
            f"Chunk {chunk_index}/{total_chunks} of one long meeting transcript.\n"
            "Return these sections only:\n"
            "- Summary\n"
            "- Decisions\n"
            "- Action Items\n"
            "- Risks / Open Questions\n"
            "- Important Terms\n\n"
            f"{chunk}"
        )

        try:
            response = self._create_completion(
                [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=750,
            )
            if not response.strip():
                raise RuntimeError("9Router returned an empty chunk summary.")
            return response
        except Exception as exc:
            logger.warning(f"⚠️ Chunk {chunk_index}/{total_chunks} summarize failed, using local chunk fallback: {exc}")
            return self._local_chunk_summary(chunk, chunk_index, total_chunks)

    def _summarize_chunk_with_retry(self, chunk, language, template, chunk_index, total_chunks):
        summary = self._summarize_chunk(chunk, language, template, chunk_index, total_chunks)
        if self._looks_like_local_chunk_fallback(summary):
            logger.info(f"↻ Retrying chunk {chunk_index}/{total_chunks} after local fallback...")
            second_summary = self._summarize_chunk(chunk, language, template, chunk_index, total_chunks)
            if not self._looks_like_local_chunk_fallback(second_summary):
                return second_summary
        return summary

    def _looks_like_local_chunk_fallback(self, value: str) -> bool:
        return "One AI summarize pass failed" in value or "No clear bullet could be extracted locally" in value

    def _reduce_chunk_summaries(
        self,
        summaries,
        language,
        template,
        progress_callback: ProgressCallback | None = None,
    ):
        current_level = [summary.strip() for summary in summaries if summary and summary.strip()]
        if not current_level:
            return self._local_fallback_memo("")

        while len(current_level) > 4:
            next_level = []
            total_batches = (len(current_level) + 3) // 4
            for batch_index in range(0, len(current_level), 4):
                batch = current_level[batch_index:batch_index + 4]
                next_level.append(self._combine_summary_batch(batch, language, batch_index // 4 + 1, total_batches))
                completed_batches = batch_index // 4 + 1
                percent = 80 + round((completed_batches / max(total_batches, 1)) * 8)
                self._notify_progress(
                    progress_callback,
                    "reducing",
                    percent,
                    total=total_batches,
                    completed=completed_batches,
                )
            current_level = next_level

        combined_summaries = "\n\n".join(
            f"## Consolidated Part {index + 1}\n{summary}" for index, summary in enumerate(current_level)
        )
        final_prompt = (
            "Below are consolidated summaries of a long meeting. "
            "Synthesize them into one complete Meeting Note with coherent decisions, actions, risks, and next steps. "
            "Do not make the result too short. Include both a concise summary and a detailed summary.\n\n"
            f"{combined_summaries}"
        )
        self._notify_progress(progress_callback, "reducing", 89, total=len(current_level), completed=len(current_level))
        return self._execute_summarize(final_prompt, language, template)

    def _combine_summary_batch(self, batch, language, batch_index, total_batches):
        system_prompt = (
            "You are condensing already-summarized meeting notes. "
            "Merge duplicates, preserve facts, and keep the output shorter than the input."
        )
        if language == "dual":
            system_prompt += " Write in bilingual Vietnamese - Japanese."
        elif language == "ja":
            system_prompt += " Write in Japanese."
        else:
            system_prompt += " Write in Vietnamese."

        user_prompt = (
            f"Batch {batch_index}/{total_batches} of consolidated meeting notes.\n"
            "Return sections: Summary, Decisions, Action Items, Risks / Open Questions, Important Terms.\n\n"
            + "\n\n".join(f"### Source {index + 1}\n{item}" for index, item in enumerate(batch))
        )

        try:
            response = self._create_completion(
                [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=900,
            )
            if not response.strip():
                raise RuntimeError("9Router returned an empty reduce summary.")
            return response
        except Exception as exc:
            logger.warning(f"⚠️ Batch reduce {batch_index}/{total_batches} failed, using local merge fallback: {exc}")
            return self._local_batch_summary(batch, batch_index, total_batches)

    def _all_glossary_terms(self) -> list[tuple[str, str, str]]:
        """Load every glossary term once and cache it for this service instance.

        Map-reduce summarization calls _get_relevant_glossary per chunk; caching
        here turns N+1 full-table scans into a single query per summarize run.
        """
        if self._glossary_terms_cache is None:
            db = SessionLocal()
            try:
                self._glossary_terms_cache = [
                    (en, jp, vi)
                    for en, jp, vi in db.query(
                        GlossaryTerm.english, GlossaryTerm.japanese, GlossaryTerm.vietnamese
                    ).all()
                ]
            finally:
                db.close()
        return self._glossary_terms_cache

    def _get_relevant_glossary(self, content: str) -> str:
        """Fetch glossary terms that appear in the content to provide context to the AI."""
        try:
            # Cached fetch (one query per summarize run); keyword match in Python
            # since content can be large.
            all_terms = self._all_glossary_terms()

            matched_terms = []
            content_lower = content.lower()

            for en, jp, vi in all_terms:
                en_main = en.split('/')[0].strip().lower() if en else ""
                jp_main = jp.split('/')[0].strip().lower() if jp else ""
                
                # Check if term exists in content
                if (en_main and len(en_main) > 3 and en_main in content_lower) or \
                   (jp_main and len(jp_main) > 1 and jp_main in content_lower):
                    matched_terms.append(f"- {en} / {jp}: {vi}")
                    
                if len(matched_terms) >= 20: # Limit to top 20 to save context window
                    break
                    
            if not matched_terms:
                return ""
                
            return "\n".join([
                "PROJECT GLOSSARY (Use these exact Vietnamese terms if they appear in the transcript):",
                *matched_terms
            ])
        except Exception as e:
            logger.warning(f"Failed to fetch relevant glossary: {e}")
            return ""

    def _execute_summarize(self, content, language="vi", template="meeting", is_chunk=False):
        system_prompt = self._get_system_prompt(template, language)
        if is_chunk:
            system_prompt = "You are a meeting analysis assistant. Summarize the most important points from the provided conversation snippet briefly."

        diarization_hint = """
        SPEAKER IDENTIFICATION: Distinguish [You/BrSE], [Manager/Client], [AI/Assistant].
        Replace generic Speaker 1, 2 labels with appropriate roles based on context.
        Preserve timestamps when they are already present in the transcript.

        SUMMARY DEPTH: Include both:
        - Short Summary: 3-5 concise bullets for quick scan.
        - Detailed Summary: 8-12 richer bullets that preserve meeting flow, context, reasoning, decisions, risks, and next steps.
        The full memo should be useful enough for a BrSE to report, follow up, and create action items without re-reading the transcript.

        CONTEXT INFERENCE: Add a short "Inferred Context" section when the transcript suggests whether this is:
        - customer meeting, internal dev sync, UAT/release discussion, incident review, Q&A clarification, or study/lesson video.
        Explain why you inferred that context from concrete phrases, topics, or flow in the transcript.
        If uncertain, say what is uncertain instead of pretending.

        BRSE EXPLANATION: Add a "BrSE Notes" section with:
        - what the BrSE should confirm next,
        - what may need customer follow-up,
        - which items should become Todo / Operations Q&A / Bug / CR,
        - business nuance or risk that may not be obvious from the raw transcript.
        """

        if not is_chunk:
            system_prompt += f"\n\n{diarization_hint}"

        if language == "dual":
            system_prompt += "\nNote: Provide the summary in a bilingual style (Vietnamese - Japanese)."

        glossary_context = self._get_relevant_glossary(content)
        if glossary_context:
            system_prompt += f"\n\n{glossary_context}"

        try:
            response = self._create_completion(
                [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": content},
                ],
                max_tokens=1800,
            )
            if not response.strip():
                raise RuntimeError("9Router returned an empty meeting memo.")
        except Exception as e:
            logger.warning(f"⚠️ 9Router summarize retry with compact prompt ({self.model}): {e}")
            try:
                response = self._create_completion(
                    [
                        {
                            "role": "system",
                            "content": (
                                "Bạn là trợ lý BrSE. Tóm tắt transcript thành Markdown ngắn gọn "
                                "với các mục: Summary, Key Decisions, Action Items, Risks, Glossary."
                            ),
                        },
                        {"role": "user", "content": content[:12000]},
                    ],
                    max_tokens=1200,
                )
                if not response.strip():
                    raise RuntimeError("9Router returned an empty compact memo.")
            except Exception as retry_error:
                logger.warning(f"⚠️ 9Router compact summarize failed; using local fallback: {retry_error}")
                response = self._local_fallback_memo(content)
        return response

    def chat(self, message, context=None):
        """
        Chat with AI with meeting context.
        """
        system_content = "You are a professional AI assistant for the Meeting Note AI system. Answer politely in Vietnamese."

        if context:
            system_content = f"""You are a professional meeting analysis assistant.
Based on the provided MEETING TRANSCRIPT below, answer the user's question accurately and honestly.
- If the information is in the transcript, answer with a brief quote.
- If the information is NOT in the transcript, politely state that it was not mentioned.
- Answer in Vietnamese, concisely, and to the point.

MEETING TRANSCRIPT:
---
{context}
---"""

        try:
            response = self._create_completion(
                [
                    {"role": "system", "content": system_content},
                    {"role": "user", "content": message},
                ],
                max_tokens=1500,
            )
        except Exception as e:
            logger.error(f"❌ 9Router Chat Error ({self.model}): {e}")
            raise e
        return response

    def live_assist(self, context, question=None, language="vi", mode="assist"):
        cleaned_context = (context or "").strip()
        cleaned_question = (question or "").strip()
        if not cleaned_context and not cleaned_question:
            return {
                "memo": [],
                "suggestions": [],
                "explanations": [],
                "questions": [],
                "reply_drafts": [],
                "raw": "",
            }

        language_hint = {
            "ja": "Use Japanese.",
            "en": "Use English.",
            "vi": "Use Vietnamese.",
        }.get(language, "Use Vietnamese.")
        mode_hint = {
            "assist": "Detect questions, issues, blockers, decisions, action items, and suggest how a BrSE should respond.",
            "explain": "Explain unclear Japanese/business/project terms and what they mean in a BrSE context.",
            "reply": "Draft concise, polite reply options suitable for a BrSE in a meeting.",
            "memo": "Create a compact real-time meeting memo from the latest transcript.",
        }.get(mode, "Detect questions, issues, blockers, decisions, action items, and suggest how a BrSE should respond.")

        system_prompt = (
            "You are a real-time BrSE copilot for live meetings and online study sessions. "
            "Work from partial transcript only; do not invent facts. "
            "Return only valid JSON without markdown fences. "
            f"{language_hint}"
        )
        user_prompt = (
            "Return this JSON shape:\n"
            "{\n"
            '  "memo": ["short real-time memo bullet"],\n'
            '  "suggestions": ["what the BrSE should do or answer next"],\n'
            '  "explanations": ["meaning of terms, nuance, risk, or business context"],\n'
            '  "questions": ["questions detected from customer or questions BrSE should ask"],\n'
            '  "reply_drafts": ["short reply draft in meeting/email tone"]\n'
            "}\n\n"
            f"MODE:\n{mode_hint}\n\n"
            f"USER QUESTION:\n{cleaned_question or 'なし'}\n\n"
            f"LIVE TRANSCRIPT CONTEXT:\n{cleaned_context[-9000:]}"
        )

        try:
            raw = self._create_completion(
                [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=1100,
            )
            parsed = parse_ai_json(raw, "Live assist parse failed")
            if parsed.get("error"):
                return self._local_live_assist(cleaned_context, cleaned_question, raw)
            return {
                "memo": self._as_string_list(parsed.get("memo")),
                "suggestions": self._as_string_list(parsed.get("suggestions")),
                "explanations": self._as_string_list(parsed.get("explanations")),
                "questions": self._as_string_list(parsed.get("questions")),
                "reply_drafts": self._as_string_list(parsed.get("reply_drafts")),
                "raw": raw,
            }
        except Exception as exc:
            logger.warning(f"⚠️ Live assist fallback ({self.model}): {exc}")
            return self._local_live_assist(cleaned_context, cleaned_question, str(exc))

    def _local_live_assist(self, context, question="", raw=""):
        lines = [line.strip() for line in re.split(r"[\n。.!?]+", context or "") if line.strip()]
        recent = lines[-8:]
        question_lines = [line for line in recent if "?" in line or "？" in line or any(word in line.lower() for word in ["why", "how", "when", "what", "なぜ", "いつ", "どう"])]
        risk_lines = [
            line for line in recent
            if any(keyword in line.lower() for keyword in ["risk", "issue", "block", "delay", "bug", "問題", "課題", "遅延", "確認"])
        ]
        memo = recent[-4:] if recent else ([question] if question else [])
        suggestions = []
        if question_lines:
            suggestions.append("Có câu hỏi đang mở. Nên xác nhận lại scope, deadline, owner trước khi trả lời chắc chắn.")
        if risk_lines:
            suggestions.append("Có dấu hiệu issue/risk. Nên ghi lại thành Q&A/Bug/CR hoặc action item sau meeting.")
        if question:
            suggestions.append("Trả lời ngắn trước, sau đó xin xác nhận nếu cần kiểm tra thêm tài liệu/source code.")
        if not suggestions:
            suggestions.append("Tiếp tục ghi memo, chờ thêm ngữ cảnh trước khi kết luận.")
        return {
            "memo": memo,
            "suggestions": suggestions,
            "explanations": risk_lines[:3],
            "questions": question_lines[:4],
            "reply_drafts": [
                "Em sẽ xác nhận lại nội dung này và phản hồi sau khi kiểm tra thêm evidence.",
                "Hiện tại em hiểu scope là như vậy, em xin confirm lại deadline/owner để tránh lệch nhận thức.",
            ],
            "raw": raw,
        }

    def _as_string_list(self, value):
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        if isinstance(value, str) and value.strip():
            return [value.strip()]
        return []

    def _create_completion(self, messages, max_tokens):
        endpoint = f"{self.base_url}/chat/completions"
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": max_tokens,
            "stream": False,
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            client = get_ai_sync_client()
            response = client.post(endpoint, json=payload, headers=headers)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise RuntimeError(f"9Router request failed: {exc}") from exc

        data = _decode_chat_completion_response(response)
        try:
            return data["choices"][0]["message"]["content"] or ""
        except (KeyError, IndexError, TypeError) as exc:
            raise RuntimeError(f"Invalid 9Router response: {data}") from exc

    def _get_system_prompt(self, template, language):
        template_group = SYSTEM_PROMPTS.get(template, SYSTEM_PROMPTS["meeting"])
        lang_key = language if language in ["vi", "ja"] else "vi"
        return template_group.get(lang_key, template_group.get("vi"))

    def _notify_progress(self, progress_callback: ProgressCallback | None, step: str, percent: int, **details):
        if progress_callback:
            progress_callback(step, max(0, min(percent, 100)), details)

    def _format_transcript_with_segments(self, transcript, segments):
        if not segments:
            return transcript

        formatted_transcript = []
        for segment in segments:
            text = (segment.get("text") or "").strip()
            if not text:
                continue
            start = float(segment.get("start", 0))
            # Prefer a real diarized speaker label when present; otherwise fall
            # back to the keyword-based role hint.
            label = segment.get("speaker") or self._infer_role_hint(text)
            formatted_transcript.append(f"[{self._seconds_label(start)}] [{label}] {text}")
        return "\n".join(formatted_transcript) if formatted_transcript else transcript

    def _seconds_label(self, value: float):
        total = max(int(value), 0)
        minutes = total // 60
        seconds = total % 60
        return f"{minutes:02d}:{seconds:02d}"

    def _infer_role_hint(self, text: str):
        lowered = text.lower()
        if re.search(r"お願いします|ご確認|認識|仕様|要件|いかが|でしょうか|ませんか", text):
            return "Customer"
        if re.search(r"bug|issue|test|uat|qa|検証|不具合", lowered):
            return "QA / Team"
        if re.search(r"対応|確認します|修正|実装|調査|共有|こちら|弊社|team|dev|backend|frontend", text + " " + lowered):
            return "BrSE / Team"
        return "Speaker"

    def _local_chunk_summary(self, chunk, chunk_index, total_chunks):
        decisions = self.signals_service._extract_candidate_lines(chunk, [r"決定", r"合意", r"decision", r"承認"], 3)
        actions = self.signals_service._extract_candidate_lines(chunk, [r"action", r"todo", r"対応", r"担当", r"next"], 4)
        risks = self.signals_service._extract_candidate_lines(chunk, [r"risk", r"issue", r"課題", r"懸念", r"未回答"], 4)
        bullet_lines = self.signals_service._extract_local_bullets(chunk, 8)
        bullets = "\n".join(f"- {line}" for line in bullet_lines) if bullet_lines else "- No clear bullet could be extracted locally."
        return (
            f"## Chunk {chunk_index}/{total_chunks}\n"
            "### Summary\n"
            f"{bullets}\n\n"
            "### Decisions\n"
            f"{self.signals_service._to_bullets(decisions, 'Review final memo to confirm decisions.')}\n\n"
            "### Action Items\n"
            f"{self.signals_service._to_bullets(actions, 'Review follow-up tasks and owners in this chunk.')}\n\n"
            "### Risks / Open Questions\n"
            f"{self.signals_service._to_bullets(risks, 'One AI summarize pass failed, so this chunk was reduced locally.')}\n\n"
            "### Important Terms\n"
            "- Review project terms from this chunk if needed.\n"
        )

    def _local_batch_summary(self, batch, batch_index, total_batches):
        preview = "\n".join(
            f"- {line}"
            for line in self.signals_service._extract_local_bullets("\n".join(batch), 10)
        ) or "- No local preview available."
        return (
            f"## Reduced Batch {batch_index}/{total_batches}\n"
            "### Summary\n"
            f"{preview}\n\n"
            "### Decisions\n"
            "- Confirm consolidated decisions from related chunks.\n\n"
            "### Action Items\n"
            "- Review consolidated follow-up items.\n\n"
            "### Risks / Open Questions\n"
            "- Batch reduction used local fallback for at least one step.\n"
        )

    def _local_fallback_memo(self, transcript):
        structured = self.signals_service._build_structured_signal_fallback(transcript, "", None)
        preview = " ".join(transcript.split())[:1200] if transcript else "Transcript is empty."
        return (
            "# Meeting Note\n\n"
            "## Short Summary\n"
            f"{self.signals_service._to_bullets([structured['summary']], 'AI summary was unavailable, but a local fallback memo was created.')}\n\n"
            "## Detailed Summary\n"
            f"{structured['detailed_summary']}\n\n"
            "## Key Decisions\n"
            f"{self.signals_service._to_bullets(structured['decisions'], 'No explicit decision could be confirmed locally.')}\n\n"
            "## Action Items\n"
            f"{self.signals_service._to_action_bullets(structured['actions'], 'Review open Q&A, risks, and follow-up tasks mentioned in the transcript.')}\n\n"
            "## Risks\n"
            f"{self.signals_service._to_bullets(structured['risks'], 'AI runtime may need retry if the 9router provider returned an empty or failed response.')}\n\n"
            "## Open Questions\n"
            f"{self.signals_service._to_bullets(structured['open_questions'], 'Recheck unresolved questions from the source transcript if needed.')}\n\n"
            "## Source Excerpt\n"
            f"{preview}\n"
        )
