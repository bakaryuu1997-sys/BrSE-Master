import os
import json
import logging
import uuid
import time
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.api.router import api_router
from app.core.ai_http import close_ai_http_clients
from app.core.config import settings
from app.core.config_security import placeholder_secret_warnings
from app.core.security import check_api_auth
from app.services.meeting_artifacts import read_meta_file, status_meta_path, update_status_meta
from app.db.session import engine, SessionLocal
from app.db.base_class import Base

# Import models to ensure they are registered with Base before create_all
from app.models.operation import OperationRecord  # noqa: F401
from app.models.report import ReportRecord  # noqa: F401
from app.models.keigo import KeigoCheckRecord  # noqa: F401
from app.models.knowledge import KnowledgeItem  # noqa: F401
from app.models.meeting import MeetingRecord  # noqa: F401
from app.models.note import UniversalNoteRecord  # noqa: F401
from app.models.client_state import ClientStateRecord  # noqa: F401
from app.models.memo import MemoNoteRecord  # noqa: F401
from app.models.project import ProjectSettingRecord  # noqa: F401
from app.models.schedule import PersonalScheduleRecord  # noqa: F401
from app.models.todo import BrseTodoItemRecord, BrseTodoProjectRecord, MeetingTodoDraftRecord  # noqa: F401
from app.models.power_tool import PowerToolsStateRecord  # noqa: F401
from app.models.email_history import EmailHistoryRecord  # noqa: F401
from app.models.meeting_minutes import MeetingMinutesRecord  # noqa: F401
from app.models.ai_prompt_profile import AiPromptProfileRecord  # noqa: F401
from app.models.meeting_task_status import MeetingTaskStatusRecord  # noqa: F401
from app.models.glossary import GlossaryTerm  # noqa: F401

# Configure standard logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

def run_migrations() -> None:
    """Bring the schema to head using Alembic — the single migration path.

    Built programmatically (no alembic.ini file) so the migration logging config
    does not clobber the application loggers configured above.
    """
    from alembic import command
    from alembic.config import Config

    backend_dir = Path(__file__).resolve().parents[1]
    alembic_cfg = Config()
    alembic_cfg.set_main_option("script_location", str(backend_dir / "migrations"))
    alembic_cfg.set_main_option("sqlalchemy.url", settings.database_url)
    command.upgrade(alembic_cfg, "head")


def init_db() -> None:
    logger.info("Initializing database...")
    # Versioned schema (column patches, recovery tables, etc.) goes through Alembic.
    try:
        run_migrations()
    except Exception as exc:  # pragma: no cover - startup resilience
        logger.error("Alembic upgrade failed; falling back to create_all. %s", exc, exc_info=True)
    # Safety net: create any brand-new model tables that have no dedicated
    # migration yet. create_all only adds missing tables and never alters them.
    Base.metadata.create_all(bind=engine)


def ensure_local_folders() -> None:
    logger.info("Ensuring local folders exist...")
    for folder in [settings.upload_folder, settings.memo_folder, settings.transcript_folder]:
        if not os.path.exists(folder):
            os.makedirs(folder, exist_ok=True)


def _auto_resume_meeting_job(record: MeetingRecord, payload: dict) -> bool:
    if not payload.get("auto_resume"):
        return False
    from app.services.meeting_job_runner import start_meeting_job_thread
    from app.services.meeting_processor import process_meeting_task, process_transcript_task

    transcript_path = record.transcript_path or os.path.join(settings.transcript_folder, f"{record.id}.txt")
    transcript_only = bool(payload.get("transcript_only"))
    if os.path.exists(transcript_path):
        record.transcript_path = transcript_path
        if transcript_only:
            record.status = "completed"
            record.completed_at = datetime.now(timezone.utc)
            update_status_meta(
                record.id,
                status="completed",
                current_step="completed",
                progress_percent=100,
                status_message="Transcript is ready. Auto-resumed from saved transcript after backend restart.",
            )
            return True
        with open(transcript_path, "r", encoding="utf-8") as handle:
            transcript = handle.read()
        record.status = "processing"
        start_meeting_job_thread(
            job_id=record.id,
            kind="meeting_auto_resume_transcript",
            target=process_transcript_task,
            args=(record.id, transcript, record.language, record.template, record.model),
            status_message="Auto-resumed memo generation from saved transcript after backend restart.",
            progress_percent=18,
            metadata={"auto_resume": True, "transcript_only": transcript_only},
        )
        return True

    if record.file_path and os.path.exists(record.file_path):
        record.status = "processing"
        start_meeting_job_thread(
            job_id=record.id,
            kind="meeting_auto_resume_media",
            target=process_meeting_task,
            args=(record.id, record.file_path, record.language, record.template, record.model, transcript_only),
            status_message="Auto-resumed transcription from source media after backend restart.",
            progress_percent=12,
            metadata={"auto_resume": True, "transcript_only": transcript_only},
        )
        return True
    return False


def mark_interrupted_meeting_jobs() -> None:
    """
    Cleans up meeting jobs that were in progress when the backend stopped.
    Marks them as failed so they can be retried properly.
    """
    active_statuses = {"pending", "processing", "recording", "transcribing", "summarizing"}
    db: Session = SessionLocal()
    try:
        records = db.query(MeetingRecord).filter(MeetingRecord.status.in_(active_statuses)).all()
        if not records:
            return
        
        logger.info(f"Found {len(records)} interrupted meeting jobs. Marking as failed for recovery.")
        for record in records:
            payload = read_meta_file(status_meta_path(record.id))
            if _auto_resume_meeting_job(record, payload):
                # Keep the job eligible for auto-resume on the next restart; routed
                # through update_status_meta so the DB mirror stays consistent.
                update_status_meta(record.id, auto_resume=True)
                continue
            record.status = "failed"
            update_status_meta(
                record.id,
                status="failed",
                current_step="interrupted",
                progress_percent=100,
                status_message="Backend restarted while this Meeting Note job was running. Click retry to continue from source media/transcript, or delete it.",
            )
        db.commit()
    except Exception as e:
        logger.error(f"Error during interrupted jobs cleanup: {e}", exc_info=True)
    finally:
        db.close()


def seed_glossary_on_startup() -> None:
    """Restore bundled glossary terms when the table is empty (e.g. after a DB
    volume reset), so web highlighting and the glossary page are never left with
    only stray manually-added terms."""
    try:
        from app.migrate_glossary import seed_glossary_if_empty

        added = seed_glossary_if_empty()
        if added:
            logger.info("Seeded %s glossary terms on startup.", added)
    except Exception as exc:  # pragma: no cover - startup resilience
        logger.error("Glossary startup seed failed: %s", exc, exc_info=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic:
    # We call this here so it only runs when the application is actually serving traffic,
    # avoiding false positives during lightweight module imports or tests.
    mark_interrupted_meeting_jobs()
    seed_glossary_on_startup()
    try:
        from app.core.ai_runtime import apply_ai_provider_config
        apply_ai_provider_config()
    except Exception as exc:  # pragma: no cover - startup resilience
        logger.error("Apply AI provider config failed: %s", exc, exc_info=True)
    yield
    await close_ai_http_clients()


def create_app() -> FastAPI:
    # Early initialization
    init_db()
    ensure_local_folders()

    # Startup validation for BRSE_API_SECRET
    secret = (settings.brse_api_secret or "").strip()
    if not secret:
        logger.warning(
            "[SECURITY WARNING] BRSE_API_SECRET is empty! "
            "All protected API endpoints will be accessible without any token validation. "
            "For security, please set a strong token in your .env file."
        )
    for warning in placeholder_secret_warnings(settings):
        logger.warning("[SECURITY WARNING] %s", warning)

    app = FastAPI(
        title="BrSE Assistant API",
        version="0.1.0",
        description="MVP API for email templates, meeting minutes, and VN/JP calendar tools.",
        lifespan=lifespan
    )

    # Request ID and process timing structured logging middleware
    @app.middleware("http")
    async def add_process_time_and_request_id(request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = f"{process_time:.4f}s"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        logger.info(
            json.dumps({
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_seconds": round(process_time, 4),
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        )
        return response

    # Register custom auth_middleware
    @app.middleware("http")
    async def auth_middleware(request: Request, call_next):
        auth_response = check_api_auth(request)
        if auth_response:
            return auth_response
        return await call_next(request)

    # Parse and whitelist CORS origins to comply with credentials specs
    allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3010",
        "http://127.0.0.1:3010",
        "http://localhost:3011",
        "http://127.0.0.1:3011",
    ]
    if settings.app_origin and settings.app_origin not in allowed_origins:
        allowed_origins.append(settings.app_origin)

    # Add CORSMiddleware AFTER custom middlewares so it wraps them as the outermost layer,
    # ensuring that CORS headers are appended even to 401 Unauthorized responses.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix="/api")

    return app


app = create_app()
