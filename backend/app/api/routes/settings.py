import io
import json
import os
import zipfile
from datetime import datetime, date
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db

# Import all models
from app.models.ai_prompt_profile import AiPromptProfileRecord
from app.models.client_state import ClientStateRecord
from app.models.email_history import EmailHistoryRecord
from app.models.glossary import GlossaryTerm
from app.models.keigo import KeigoCheckRecord
from app.models.knowledge import KnowledgeItem
from app.models.meeting import MeetingRecord
from app.models.meeting_minutes import MeetingMinutesRecord
from app.models.meeting_task_status import MeetingTaskStatusRecord
from app.models.memo import MemoNoteRecord
from app.models.note import UniversalNoteRecord
from app.models.operation import (
    OperationRecord,
    OperationDecisionLog,
    OperationReleaseGate,
    OperationDependencyLink,
    OperationTestMatrixItem,
)
from app.models.power_tool import PowerToolsStateRecord
from app.models.project import ProjectSettingRecord
from app.models.report import ReportRecord
from app.models.schedule import PersonalScheduleRecord
from app.models.todo import (
    BrseTodoProjectRecord,
    BrseTodoItemRecord,
    MeetingTodoDraftRecord,
)

router = APIRouter()

MODELS_MAP = {
    "AiPromptProfileRecord": AiPromptProfileRecord,
    "ClientStateRecord": ClientStateRecord,
    "EmailHistoryRecord": EmailHistoryRecord,
    "GlossaryTerm": GlossaryTerm,
    "KeigoCheckRecord": KeigoCheckRecord,
    "KnowledgeItem": KnowledgeItem,
    "MeetingRecord": MeetingRecord,
    "MeetingMinutesRecord": MeetingMinutesRecord,
    "MeetingTaskStatusRecord": MeetingTaskStatusRecord,
    "MemoNoteRecord": MemoNoteRecord,
    "UniversalNoteRecord": UniversalNoteRecord,
    "OperationRecord": OperationRecord,
    "OperationDecisionLog": OperationDecisionLog,
    "OperationReleaseGate": OperationReleaseGate,
    "OperationDependencyLink": OperationDependencyLink,
    "OperationTestMatrixItem": OperationTestMatrixItem,
    "PowerToolsStateRecord": PowerToolsStateRecord,
    "ProjectSettingRecord": ProjectSettingRecord,
    "ReportRecord": ReportRecord,
    "PersonalScheduleRecord": PersonalScheduleRecord,
    "BrseTodoProjectRecord": BrseTodoProjectRecord,
    "BrseTodoItemRecord": BrseTodoItemRecord,
    "MeetingTodoDraftRecord": MeetingTodoDraftRecord,
}

# Safe delete/truncation order to satisfy foreign keys
DELETE_ORDER = [
    "MeetingTodoDraftRecord",
    "BrseTodoItemRecord",
    "BrseTodoProjectRecord",
    "UniversalNoteRecord",
    "MemoNoteRecord",
    "MeetingMinutesRecord",
    "MeetingTaskStatusRecord",
    "MeetingRecord",
    "OperationTestMatrixItem",
    "OperationDependencyLink",
    "OperationReleaseGate",
    "OperationDecisionLog",
    "OperationRecord",
    "KeigoCheckRecord",
    "EmailHistoryRecord",
    "ClientStateRecord",
    "PowerToolsStateRecord",
    "PersonalScheduleRecord",
    "GlossaryTerm",
    "KnowledgeItem",
    "AiPromptProfileRecord",
    "ProjectSettingRecord",
    "ReportRecord",
]


def serialize_sqlalchemy(obj) -> dict:
    data = {}
    for column in obj.__table__.columns:
        val = getattr(obj, column.name)
        if hasattr(val, "isoformat"):
            data[column.name] = val.isoformat()
        else:
            data[column.name] = val
    return data


@router.post("/backup")
def export_backup(db: Session = Depends(get_db)):
    """Serialize all database records and media files, then package them as a .brsebackup zip."""
    db_dump = {}
    for name, model_class in MODELS_MAP.items():
        rows = db.query(model_class).all()
        db_dump[name] = [serialize_sqlalchemy(row) for row in rows]

    # Create zip in-memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
        # 1. Database json dump
        zip_file.writestr(
            "database_dump.json",
            json.dumps(db_dump, ensure_ascii=False, indent=2),
        )

        # 2. Uploads folder
        if os.path.exists(settings.upload_folder):
            for root, _, files in os.walk(settings.upload_folder):
                for file in files:
                    filepath = os.path.join(root, file)
                    zip_file.write(filepath, filepath)

        # 3. Memos folder
        if os.path.exists(settings.memo_folder):
            for root, _, files in os.walk(settings.memo_folder):
                for file in files:
                    filepath = os.path.join(root, file)
                    zip_file.write(filepath, filepath)

        # 4. Transcripts folder
        if os.path.exists(settings.transcript_folder):
            for root, _, files in os.walk(settings.transcript_folder):
                for file in files:
                    filepath = os.path.join(root, file)
                    zip_file.write(filepath, filepath)

    zip_buffer.seek(0)
    filename = f"brse-os-backup-{datetime.now().strftime('%Y%m%d-%H%M%S')}.brsebackup"
    headers = {"Content-Disposition": f"attachment; filename={filename}"}
    return StreamingResponse(
        zip_buffer, media_type="application/zip", headers=headers
    )


@router.post("/restore")
async def import_restore(
    file: UploadFile = File(...), db: Session = Depends(get_db)
):
    """Restore database and files from a uploaded .brsebackup package."""
    MAX_BACKUP_BYTES = 100 * 1024 * 1024  # 100MB max backup package
    MAX_UNCOMPRESSED_BYTES = 500 * 1024 * 1024  # 500MB max total uncompressed payload

    # Read uploaded archive in chunks with strict size guard to prevent Memory Exhaustion DoS
    total_read = 0
    zip_buffer = io.BytesIO()
    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        total_read += len(chunk)
        if total_read > MAX_BACKUP_BYTES:
            raise HTTPException(
                status_code=413,
                detail="Tệp sao lưu vượt quá dung lượng cho phép (tối đa 100MB).",
            )
        zip_buffer.write(chunk)
    zip_buffer.seek(0)

    try:
        with zipfile.ZipFile(zip_buffer, "r") as zip_file:
            # Check total uncompressed payload against Zip Bomb exhaustion
            total_uncompressed = sum(info.file_size for info in zip_file.infolist())
            if total_uncompressed > MAX_UNCOMPRESSED_BYTES:
                raise HTTPException(
                    status_code=400,
                    detail="Dung lượng giải nén vượt quá ngưỡng an toàn (Zip Bomb protection).",
                )

            file_list = zip_file.namelist()
            if "database_dump.json" not in file_list:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid backup format: missing database_dump.json",
                )

            # 1. Parse database records
            db_dump_raw = zip_file.read("database_dump.json").decode("utf-8")
            db_dump = json.loads(db_dump_raw)

            # Delete existing records in dependency-safe order
            for name in DELETE_ORDER:
                if name in MODELS_MAP:
                    db.query(MODELS_MAP[name]).delete()

            # Insert in reverse safe order
            INSERT_ORDER = list(reversed(DELETE_ORDER))
            for name in INSERT_ORDER:
                if name in db_dump and name in MODELS_MAP:
                    model_class = MODELS_MAP[name]
                    data_list = db_dump[name]

                    for item in data_list:
                        obj_data = {}
                        for col in model_class.__table__.columns:
                            val = item.get(col.name)
                            if val and isinstance(val, str):
                                if "date" in str(col.type).lower() or "time" in str(col.type).lower():
                                    try:
                                        clean_val = val.replace("Z", "+00:00")
                                        if col.type.python_type.__name__ == "date":
                                            obj_data[col.name] = date.fromisoformat(clean_val[:10])
                                        else:
                                            obj_data[col.name] = datetime.fromisoformat(clean_val)
                                    except Exception:
                                        obj_data[col.name] = val
                                else:
                                    obj_data[col.name] = val
                            else:
                                obj_data[col.name] = val

                        db.add(model_class(**obj_data))

            db.commit()

            # 2. Extract media files back to folders safely (Zip Slip protection)
            allowed_extract_roots = [
                Path(settings.upload_folder).resolve(),
                Path(settings.memo_folder).resolve(),
                Path(settings.transcript_folder).resolve(),
            ]

            for info in zip_file.infolist():
                if (
                    info.filename == "database_dump.json"
                    or info.is_dir()
                    or info.filename.endswith("/")
                ):
                    continue

                target_path = Path(info.filename).resolve()
                is_safe = any(
                    target_path == root or root in target_path.parents
                    for root in allowed_extract_roots
                )
                if not is_safe:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Phát hiện đường dẫn không hợp lệ hoặc chứa tấn công Path Traversal: {info.filename}",
                    )

                target_path.parent.mkdir(parents=True, exist_ok=True)
                with zip_file.open(info) as src, open(target_path, "wb") as dst:
                    while True:
                        buf = src.read(1024 * 1024)
                        if not buf:
                            break
                        dst.write(buf)

            return {
                "status": "success",
                "message": "Toàn bộ dữ liệu BrSE OS đã được phục hồi nguyên vẹn!",
            }

    except zipfile.BadZipFile:
        raise HTTPException(
            status_code=400,
            detail="Tệp tin sao lưu bị hỏng hoặc không đúng định dạng.",
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi hệ thống khi thực hiện Restore: {str(e)}",
        )
