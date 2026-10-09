"""
ai.py — FastAPI router for AI-powered features.

Endpoints:
  POST /ai/keigo   — Keigo correction
  POST /ai/report  — HORENSO daily report from Vietnamese bullet points
  POST /ai/minutes — Extract meeting minutes from transcript
  GET  /ai/keigo/history — Retrieve saved Keigo check history
"""

import asyncio
import json
import time
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.redaction import redact_sensitive_text
from app.core.ai_runtime import (
    DEFAULT_MODEL,
    add_custom_model,
    get_ai_provider_config,
    get_known_ai_models,
    get_selected_ai_model,
    remove_custom_model,
    set_ai_provider_config,
    set_selected_ai_model,
)
from app.core.ai import (
    CHAT_SYSTEM_PROMPT,
    create_chat_completion,
    extract_meeting_minutes,
    generate_chat_reply,
    generate_daily_report,
    generate_keigo_correction,
    generate_requirement_reply,
    is_ollama_model,
    normalize_ollama_model,
    rewrite_slide_bullets,
    stream_chat_completion,
    summarize_markdown_to_slides,
    get_selected_runtime_metadata,
)
from app.db.session import get_db
from app.models.ai_prompt_profile import AiPromptProfileRecord
from app.models.keigo import KeigoCheckRecord
from app.schemas.ai_prompt_profile import (
    AiPromptProfileCreate,
    AiPromptProfileRead,
    AiPromptProfileUpdate,
)
from app.services.keigo_local import local_keigo_fallback

# OCR now lives in ai_ocr.py (kept small so its @router.post can't get stranded
# on a helper again). Re-exported so existing tests/callers that reference
# app.api.routes.ai.<symbol> keep working, and so this module can still call
# run_local_tesseract_ocr.
from app.api.routes.ai_ocr import (  # noqa: F401
    OcrRequest,
    fetch_image_url_as_base64,
    perform_ocr,
    run_local_tesseract_ocr,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class KeigoRequest(BaseModel):
    text: str
    customer_style: str = ""
    communication_notes: str = ""
    report_rule: str = ""
    project_id: str = ""
    prompt_profile_id: str = ""


class ReportRequest(BaseModel):
    project: str = ""
    owner: str = ""
    progress: str = "0"
    tasks_done: list[str] = Field(default_factory=list)
    tasks_wip: str = ""
    tasks_tomorrow: str = ""
    blockers: str = ""
    bullet_points: str = ""
    customer_style: str = ""
    report_rule: str = ""
    timezone_rule: str = ""
    communication_notes: str = ""
    project_id: str = ""
    prompt_profile_id: str = ""


class MinutesRequest(BaseModel):
    transcript: str
    project_id: str = ""
    prompt_profile_id: str = ""
    customer_style: str = ""
    report_rule: str = ""
    timezone_rule: str = ""
    communication_notes: str = ""


class ChatRequest(BaseModel):
    message: str


class RequirementChatRequest(BaseModel):
    question: str
    requirement_context: str = ""
    customer_style: str = ""
    communication_notes: str = ""


class AiModelRequest(BaseModel):
    model: str


class AiCustomModelRequest(BaseModel):
    """Add a user-defined model. `id` is the runtime model id (Ollama tag or
    9router model id); provider hints how the UI groups it."""
    id: str
    label: Optional[str] = None
    provider: Optional[str] = None
    notes: Optional[str] = None


class AiProviderConfigUpdate(BaseModel):
    """Partial update of AI provider endpoints/keys. Omitted or empty-secret
    fields are left unchanged on the server."""
    openai_base_url: Optional[str] = None
    openai_api_key: Optional[str] = None
    nine_router_base_url: Optional[str] = None
    nine_router_api_key: Optional[str] = None
    ollama_base_url: Optional[str] = None
    ocr_vision_model: Optional[str] = None
    gemini_api_key: Optional[str] = None


class AiModelSmokeRequest(BaseModel):
    message: str = "Tra loi dung mot tu OK"
    # Per-model timeout. Big 9router/Ollama models can need >18s for first token.
    timeout_seconds: int = 18
    # Run models one-at-a-time to avoid provider contention/rate-limits that make
    # parallel smokes report false timeouts.
    sequential: bool = False


class SlideSummarizeRequest(BaseModel):
    markdown: str
    max_slides: int = 6
    project_id: Optional[str] = None
    project_context: str = ""


class SlideRewriteRequest(BaseModel):
    markdown: str
    tone: str = "executive"
    project_id: Optional[str] = None
    project_context: str = ""





def normalize_prompt_use_case(use_case: str) -> str:
    normalized = use_case.strip().lower()
    allowed = {"keigo", "report", "minutes", "chat", "requirements", "slides", "knowledge"}
    if normalized not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported AI prompt use_case: {use_case}")
    return normalized


def unset_prompt_default_conflicts(db: Session, record: AiPromptProfileRecord) -> None:
    if not record.is_default:
        return
    query = db.query(AiPromptProfileRecord).filter(
        AiPromptProfileRecord.use_case == record.use_case,
        AiPromptProfileRecord.project_id == (record.project_id or ""),
    )
    if record.id:
        query = query.filter(AiPromptProfileRecord.id != record.id)
    for sibling in query.all():
        sibling.is_default = False


def find_prompt_profile(
    db: Session,
    *,
    use_case: str,
    project_id: str = "",
    prompt_profile_id: str = "",
) -> AiPromptProfileRecord | None:
    normalized_use_case = normalize_prompt_use_case(use_case)
    if prompt_profile_id:
        record = db.query(AiPromptProfileRecord).filter(AiPromptProfileRecord.id == prompt_profile_id).first()
        if not record:
            raise HTTPException(status_code=404, detail="AI prompt profile not found.")
        if record.use_case != normalized_use_case:
            raise HTTPException(status_code=400, detail="AI prompt profile use_case does not match this endpoint.")
        return record

    cleaned_project_id = project_id.strip()
    if cleaned_project_id:
        project_default = (
            db.query(AiPromptProfileRecord)
            .filter(
                AiPromptProfileRecord.use_case == normalized_use_case,
                AiPromptProfileRecord.project_id == cleaned_project_id,
                AiPromptProfileRecord.is_default.is_(True),
            )
            .order_by(AiPromptProfileRecord.updated_at.desc())
            .first()
        )
        if project_default:
            return project_default

    return (
        db.query(AiPromptProfileRecord)
        .filter(
            AiPromptProfileRecord.use_case == normalized_use_case,
            AiPromptProfileRecord.project_id == "",
            AiPromptProfileRecord.is_default.is_(True),
        )
        .order_by(AiPromptProfileRecord.updated_at.desc())
        .first()
    )


def resolve_system_prompt(
    db: Session,
    *,
    use_case: str,
    project_id: str = "",
    prompt_profile_id: str = "",
) -> str | None:
    profile = find_prompt_profile(
        db,
        use_case=use_case,
        project_id=project_id,
        prompt_profile_id=prompt_profile_id,
    )
    return profile.system_prompt if profile else None


# ---------------------------------------------------------------------------
# AI Prompt Profiles
# ---------------------------------------------------------------------------


@router.get("/prompt-profiles", response_model=list[AiPromptProfileRead])
def list_prompt_profiles(
    use_case: str | None = None,
    project_id: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(AiPromptProfileRecord)
    if use_case:
        query = query.filter(AiPromptProfileRecord.use_case == normalize_prompt_use_case(use_case))
    if project_id is not None:
        query = query.filter(AiPromptProfileRecord.project_id == project_id.strip())
    return query.order_by(AiPromptProfileRecord.updated_at.desc()).all()


@router.post("/prompt-profiles", response_model=AiPromptProfileRead, status_code=201)
def create_prompt_profile(payload: AiPromptProfileCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    data["use_case"] = normalize_prompt_use_case(data["use_case"])
    data["project_id"] = data.get("project_id", "").strip()
    record = AiPromptProfileRecord(**data)
    db.add(record)
    db.flush()
    unset_prompt_default_conflicts(db, record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/prompt-profiles/resolve", response_model=AiPromptProfileRead)
def resolve_prompt_profile(
    use_case: str,
    project_id: str = "",
    prompt_profile_id: str = "",
    db: Session = Depends(get_db),
):
    record = find_prompt_profile(
        db,
        use_case=use_case,
        project_id=project_id,
        prompt_profile_id=prompt_profile_id,
    )
    if not record:
        raise HTTPException(status_code=404, detail="No AI prompt profile matches this scope.")
    return record


@router.put("/prompt-profiles/{profile_id}", response_model=AiPromptProfileRead)
def update_prompt_profile(profile_id: str, payload: AiPromptProfileUpdate, db: Session = Depends(get_db)):
    record = db.query(AiPromptProfileRecord).filter(AiPromptProfileRecord.id == profile_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="AI prompt profile not found.")
    data = payload.model_dump(exclude_unset=True)
    if "use_case" in data and data["use_case"] is not None:
        data["use_case"] = normalize_prompt_use_case(data["use_case"])
    if "project_id" in data and data["project_id"] is not None:
        data["project_id"] = data["project_id"].strip()
    for field, value in data.items():
        setattr(record, field, value)
    unset_prompt_default_conflicts(db, record)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/prompt-profiles/{profile_id}")
def delete_prompt_profile(profile_id: str, db: Session = Depends(get_db)):
    record = db.query(AiPromptProfileRecord).filter(AiPromptProfileRecord.id == profile_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="AI prompt profile not found.")
    db.delete(record)
    db.commit()
    return {"message": "AI prompt profile deleted"}


# ---------------------------------------------------------------------------
# F6 — Keigo Checker
# ---------------------------------------------------------------------------


@router.post("/keigo")
async def check_keigo(request: KeigoRequest, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Analyze Japanese text and return Keigo corrections with Vietnamese explanations."""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="テキストが空です。")

    system_prompt = resolve_system_prompt(
        db,
        use_case="keigo",
        project_id=request.project_id,
        prompt_profile_id=request.prompt_profile_id,
    )
    try:
        result = await generate_keigo_correction(
            request.text,
            customer_style=request.customer_style,
            communication_notes=request.communication_notes,
            report_rule=request.report_rule,
            system_prompt=system_prompt,
        )
    except RuntimeError:
        result = local_keigo_fallback(request.text)
        result["fallback"] = "local_rule_engine"

    if "error" not in result:
        # Persist to DB
        record = KeigoCheckRecord(
            original_text=request.text,
            improved_text=result.get("improved", ""),
            level=result.get("level", ""),
            score=result.get("score"),
            summary_vi=result.get("summary_vi", ""),
            changes_json=json.dumps(result.get("changes", []), ensure_ascii=False),
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        result["id"] = record.id
        result["created_at"] = record.created_at.isoformat()

    return result


@router.get("/keigo/history")
def get_keigo_history(limit: int = 20, db: Session = Depends(get_db)) -> list[dict]:
    """Return the most recent Keigo check records."""
    records = (
        db.query(KeigoCheckRecord)
        .order_by(KeigoCheckRecord.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": r.id,
            "original_text": r.original_text,
            "improved_text": r.improved_text,
            "level": r.level,
            "score": r.score,
            "summary_vi": r.summary_vi,
            "changes": json.loads(r.changes_json) if r.changes_json else [],
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]


@router.delete("/keigo/history/{record_id}")
def delete_keigo_record(record_id: int, db: Session = Depends(get_db)) -> dict:
    """Delete a specific Keigo check record."""
    record = db.query(KeigoCheckRecord).filter(KeigoCheckRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found.")
    db.delete(record)
    db.commit()
    return {"message": "Deleted"}


# ---------------------------------------------------------------------------
# F7 — AI Daily Report Generator
# ---------------------------------------------------------------------------


@router.post("/report")
async def generate_report(request: ReportRequest, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Generate a Japanese HORENSO daily report from Vietnamese bullet points."""
    system_prompt = resolve_system_prompt(
        db,
        use_case="report",
        project_id=request.project_id,
        prompt_profile_id=request.prompt_profile_id,
    )
    try:
        result = await generate_daily_report(
            project=request.project,
            owner=request.owner,
            progress=request.progress,
            tasks_done=request.tasks_done,
            tasks_wip=request.tasks_wip,
            tasks_tomorrow=request.tasks_tomorrow,
            blockers=request.blockers,
            bullet_points=request.bullet_points,
            customer_style=request.customer_style,
            report_rule=request.report_rule,
            timezone_rule=request.timezone_rule,
            communication_notes=request.communication_notes,
            system_prompt=system_prompt,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return result


# ---------------------------------------------------------------------------
# F8 — AI Meeting Minutes Extractor
# ---------------------------------------------------------------------------


@router.post("/minutes")
async def extract_minutes(request: MinutesRequest, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Extract structured meeting minutes from a raw chat transcript."""
    if not request.transcript.strip():
        raise HTTPException(status_code=400, detail="トランスクリプトが空です。")

    system_prompt = resolve_system_prompt(
        db,
        use_case="minutes",
        project_id=request.project_id,
        prompt_profile_id=request.prompt_profile_id,
    )
    try:
        result = await extract_meeting_minutes(
            request.transcript,
            customer_style=request.customer_style,
            report_rule=request.report_rule,
            timezone_rule=request.timezone_rule,
            communication_notes=request.communication_notes,
            system_prompt=system_prompt,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return result


@router.get("/status")
async def get_ai_status(check_runtime: bool = False) -> dict[str, Any]:
    """Return AI config and optionally check whether the local 9Router runtime responds."""
    selected_model = get_selected_ai_model()
    uses_ollama = is_ollama_model(selected_model)
    base_url = settings.ollama_base_url if uses_ollama else settings.openai_base_url
    status: dict[str, Any] = {
        "provider": "ollama" if uses_ollama else "9router",
        "base_url": base_url,
        "model": selected_model,
        "default_model": DEFAULT_MODEL,
        "available_models": get_known_ai_models(),
        "configured": bool(base_url and selected_model),
        "runtime_checked": check_runtime,
        "runtime_reachable": None,
        "runtime_status_code": None,
        "runtime_error": "",
        "runtime_model_available": None,
    }

    if not check_runtime:
        return status

    try:
        async with httpx.AsyncClient(timeout=2.5) as client:
            if uses_ollama:
                response = await client.get(f"{settings.ollama_base_url.rstrip('/')}/api/tags")
            else:
                response = await client.get(
                    f"{settings.openai_base_url.rstrip('/')}/models",
                    headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                )
        status["runtime_status_code"] = response.status_code
        status["runtime_reachable"] = response.status_code < 500
        if uses_ollama and response.status_code == 200:
            payload = response.json()
            installed = {
                str(item.get("name") or item.get("model") or "")
                for item in payload.get("models", [])
                if isinstance(item, dict)
            }
            status["runtime_model_available"] = normalize_ollama_model(selected_model) in installed
    except httpx.HTTPError as exc:
        status["runtime_reachable"] = False
        status["runtime_error"] = redact_sensitive_text(str(exc), extra_secrets=[settings.openai_api_key])

    return status


@router.get("/health")
async def get_ai_health() -> dict[str, Any]:
    """Lightweight AI health check — always checks runtime reachability with latency_ms.

    Designed for frontend status badges (poll every 30 s).
    Response shape: { provider, model, reachable, latency_ms, error }
    """
    import time

    selected_model = get_selected_ai_model()
    uses_ollama = is_ollama_model(selected_model)
    provider = "ollama" if uses_ollama else "9router"
    result: dict[str, Any] = {
        "provider": provider,
        "model": selected_model,
        "reachable": False,
        "latency_ms": None,
        "error": "",
    }
    try:
        t0 = time.monotonic()
        async with httpx.AsyncClient(timeout=3.0) as client:
            if uses_ollama:
                response = await client.get(f"{settings.ollama_base_url.rstrip('/')}/api/tags")
            else:
                response = await client.get(
                    f"{settings.openai_base_url.rstrip('/')}/models",
                    headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                )
        result["latency_ms"] = round((time.monotonic() - t0) * 1000)
        result["reachable"] = response.status_code < 500
    except httpx.HTTPError as exc:
        result["error"] = redact_sensitive_text(str(exc), extra_secrets=[settings.openai_api_key])
    return result


@router.get("/models")
async def get_ai_models(check_runtime: bool = False) -> dict[str, Any]:
    """Return curated model presets and, optionally, the runtime /models list."""
    selected_model = get_selected_ai_model()
    uses_ollama = is_ollama_model(selected_model)
    base_url = settings.ollama_base_url if uses_ollama else settings.openai_base_url
    result: dict[str, Any] = {
        "provider": "ollama" if uses_ollama else "9router",
        "base_url": base_url,
        "selected_model": selected_model,
        "default_model": DEFAULT_MODEL,
        "presets": get_known_ai_models(),
        "runtime_models": [],
        "runtime_checked": check_runtime,
        "runtime_reachable": None,
        "runtime_error": "",
    }

    if not check_runtime:
        return result

    try:
        async with httpx.AsyncClient(timeout=3.5) as client:
            if uses_ollama:
                response = await client.get(f"{settings.ollama_base_url.rstrip('/')}/api/tags")
            else:
                response = await client.get(
                    f"{settings.openai_base_url.rstrip('/')}/models",
                    headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                )
            response.raise_for_status()
        payload = response.json()
        if uses_ollama:
            result["runtime_models"] = payload.get("models", []) if isinstance(payload, dict) else []
        else:
            result["runtime_models"] = payload.get("data", []) if isinstance(payload, dict) else []
        result["runtime_reachable"] = True
    except (httpx.HTTPError, ValueError) as exc:
        result["runtime_reachable"] = False
        result["runtime_error"] = redact_sensitive_text(str(exc), extra_secrets=[settings.openai_api_key])

    return result


@router.get("/config")
async def read_ai_config() -> dict[str, Any]:
    """Current AI provider endpoints + which secrets are configured (never the
    secret values themselves)."""
    return get_ai_provider_config()


@router.put("/config")
async def update_ai_config(request: AiProviderConfigUpdate) -> dict[str, Any]:
    """Set AI provider endpoints/keys at runtime (persisted, applied immediately).
    Empty secret fields keep the existing value."""
    return set_ai_provider_config(request.model_dump(exclude_unset=True))


@router.post("/model")
async def select_ai_model(request: AiModelRequest) -> dict[str, Any]:
    """Persist the selected 9router model for all local AI features."""
    try:
        model = set_selected_ai_model(request.model)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "provider": "ollama" if is_ollama_model(model) else "9router",
        "model": model,
        "available_models": get_known_ai_models(),
    }


@router.post("/models/custom", status_code=201)
async def add_ai_custom_model(request: AiCustomModelRequest) -> dict[str, Any]:
    """Add a user-defined model (e.g. a new Ollama or 9router id) selectable
    alongside the curated presets."""
    try:
        entry = add_custom_model(
            request.id,
            label=request.label or "",
            provider=request.provider or "custom",
            notes=request.notes or "",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"model": entry, "available_models": get_known_ai_models()}


@router.delete("/models/custom/{model_id:path}")
async def delete_ai_custom_model(model_id: str) -> dict[str, Any]:
    """Remove a user-defined model. Reverts to the default model if it was active."""
    try:
        removed = remove_custom_model(model_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not removed:
        raise HTTPException(status_code=404, detail=f"Custom model '{model_id}' not found.")
    return {
        "removed": model_id,
        "selected_model": get_selected_ai_model(),
        "available_models": get_known_ai_models(),
    }


@router.post("/model-smoke")
async def smoke_ai_models(request: AiModelSmokeRequest) -> dict[str, Any]:
    """Smoke-test all curated AI models without changing the active model."""
    message = request.message.strip() or "Tra loi dung mot tu OK"
    timeout_s = max(3, min(int(request.timeout_seconds), 90))

    async def smoke_one_model(preset: dict[str, Any]) -> dict[str, Any]:
        model = preset["id"]
        uses_ollama = is_ollama_model(model)
        started = time.monotonic()
        item: dict[str, Any] = {
            "id": model,
            "label": preset.get("label", model),
            "provider": "ollama" if uses_ollama else "9router",
            "ok": False,
            "status": "error",
            "elapsed_ms": None,
            "reply_preview": "",
            "error": "",
        }
        try:
            raw = await asyncio.wait_for(
                create_chat_completion(
                    messages=[
                        {"role": "system", "content": CHAT_SYSTEM_PROMPT},
                        {"role": "user", "content": message},
                    ],
                    temperature=0.1,
                    max_tokens=32,
                    model=model,
                ),
                timeout=timeout_s,
            )
            item["reply_preview"] = raw.strip()[:120]
            item["ok"] = bool(raw.strip())
            item["status"] = "ok" if item["ok"] else "empty"
        except TimeoutError:
            item["status"] = "timeout"
            item["error"] = f"Model smoke timed out after {timeout_s} seconds."
        except Exception as exc:
            item["error"] = redact_sensitive_text(
                str(exc),
                extra_secrets=[settings.openai_api_key, settings.nine_router_api_key, settings.gemini_api_key],
            )[:300]
        finally:
            item["elapsed_ms"] = round((time.monotonic() - started) * 1000)
        return item

    presets = get_known_ai_models()
    if request.sequential:
        results = [await smoke_one_model(preset) for preset in presets]
    else:
        results = await asyncio.gather(*(smoke_one_model(preset) for preset in presets))

    return {
        "active_model": get_selected_ai_model(),
        "active_runtime": get_selected_runtime_metadata(),
        "results": results,
    }


@router.post("/chat")
async def chat(request: ChatRequest) -> dict[str, Any]:
    """Small chat endpoint used to verify the real 9Router path from the UI."""
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="メッセージが空です。")
    try:
        return await generate_chat_reply(request.message)
    except RuntimeError as exc:
        # Text chat has no image to fall back on (ChatRequest carries only a
        # message). The offline Tesseract fallback belongs to the OCR route, not
        # here — referencing request.base64_image threw AttributeError. Just
        # surface the AI error with secrets redacted.
        raise HTTPException(
            status_code=503,
            detail=redact_sensitive_text(str(exc), extra_secrets=[settings.openai_api_key, settings.nine_router_api_key, settings.gemini_api_key]),
        ) from exc


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """Streaming chat endpoint for BrSE Assistant."""
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="メッセージが空です。")

    async def event_generator():
        try:
            async for chunk in stream_chat_completion(
                messages=[
                    {"role": "system", "content": CHAT_SYSTEM_PROMPT},
                    {"role": "user", "content": request.message},
                ],
                temperature=0.4,
                max_tokens=900,
            ):
                yield f"data: {json.dumps({'text': chunk})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': redact_sensitive_text(str(e), extra_secrets=[settings.openai_api_key, settings.nine_router_api_key, settings.gemini_api_key])})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/requirements/chat")
async def requirement_chat(request: RequirementChatRequest) -> dict[str, Any]:
    """Clarify requirements and draft practical customer questions for BrSE work."""
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="質問が空です。")
    try:
        return await generate_requirement_reply(
            request.question,
            requirement_context=request.requirement_context,
            customer_style=request.customer_style,
            communication_notes=request.communication_notes,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/slides/summarize")
async def summarize_slides(request: SlideSummarizeRequest) -> dict[str, Any]:
    """Summarize long markdown into a concise slide deck markdown."""
    if not request.markdown.strip():
        raise HTTPException(status_code=400, detail="Markdown is empty.")

    try:
        return await summarize_markdown_to_slides(
            request.markdown,
            max_slides=request.max_slides,
            project_context=request.project_context,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/slides/rewrite")
async def rewrite_slides(request: SlideRewriteRequest) -> dict[str, Any]:
    """Rewrite slide bullets to executive or Japanese-client tone."""
    if not request.markdown.strip():
        raise HTTPException(status_code=400, detail="Markdown is empty.")

    try:
        return await rewrite_slide_bullets(request.markdown, request.tone, project_context=request.project_context)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


class KnowledgeAskRequest(BaseModel):
    question: str
    project_id: Optional[str] = None


@router.post("/ask-knowledge")
async def ask_knowledge(
    request: KnowledgeAskRequest, db: Session = Depends(get_db)
) -> dict[str, Any]:
    """Search knowledge base and generate an AI answer."""
    from app.models.knowledge import KnowledgeItem

    # 1. Search for relevant context
    query = db.query(KnowledgeItem).filter(
        KnowledgeItem.content.contains(request.question[:20])
    )
    if request.project_id:
        query = query.filter(KnowledgeItem.project_id == request.project_id)

    items = query.limit(3).all()
    context = "\n\n".join(
        [f"--- {item.title} ---\n{item.content}" for item in items]
    )

    if not items:
        context = "ナレッジベースに関連する情報は見つかりませんでした。"

    # 2. Generate AI answer
    try:
        from app.core.ai import generate_knowledge_answer

        answer = await generate_knowledge_answer(request.question, context)
        return {
            "answer": answer,
            "sources": [{"id": item.id, "title": item.title} for item in items],
        }
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


