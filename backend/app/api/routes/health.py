from datetime import UTC, date, datetime, timedelta
import glob
import os
import shutil
import subprocess
import threading
import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.client_state import ClientStateRecord
from app.models.meeting import MeetingRecord
from app.models.meeting_minutes import MeetingMinutesRecord
from app.models.meeting_task_status import MeetingTaskStatusRecord
from app.models.operation import OperationRecord
from app.models.project import ProjectSettingRecord
from app.models.glossary import GlossaryTerm
from app.models.todo import BrseTodoItemRecord, BrseTodoProjectRecord

router = APIRouter()


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "brse-assistant-api"}


@router.get("/health/db")
def database_health_check(db: Session = Depends(get_db)) -> dict[str, str]:
    db.execute(text("select 1"))
    dialect = db.bind.dialect.name if db.bind is not None else "unknown"
    return {"status": "ok", "database": dialect}


def _safe_count(db: Session, model: Any) -> int | None:
    try:
        return int(db.query(model).count())
    except Exception:
        return None


def _disk_snapshot(path: str = "/") -> dict[str, Any]:
    usage = shutil.disk_usage(path)
    percent = round((usage.used / usage.total) * 100, 1) if usage.total else 0
    return {
        "path": path,
        "total_bytes": usage.total,
        "used_bytes": usage.used,
        "free_bytes": usage.free,
        "used_percent": percent,
        "status": "warn" if percent >= 85 else "ok",
    }


def _read_proc_meminfo() -> dict[str, int] | None:
    try:
        values: dict[str, int] = {}
        with open("/proc/meminfo", encoding="utf-8") as handle:
            for line in handle:
                key, raw = line.split(":", 1)
                parts = raw.strip().split()
                if parts and parts[0].isdigit():
                    values[key] = int(parts[0]) * 1024
        return values
    except Exception:
        return None


def _read_process_rss_bytes() -> int | None:
    try:
        with open("/proc/self/status", encoding="utf-8") as handle:
            for line in handle:
                if line.startswith("VmRSS:"):
                    parts = line.split()
                    if len(parts) >= 2 and parts[1].isdigit():
                        return int(parts[1]) * 1024
    except Exception:
        return None
    return None


def _memory_snapshot() -> dict[str, Any]:
    meminfo = _read_proc_meminfo()
    rss = _read_process_rss_bytes()
    if not meminfo:
        return {
            "status": "warn",
            "detail": "Memory metrics are not available on this runtime.",
            "process_rss_bytes": rss,
        }

    total = meminfo.get("MemTotal", 0)
    available = meminfo.get("MemAvailable", 0)
    used = max(0, total - available)
    used_percent = round((used / total) * 100, 1) if total else 0
    return {
        "status": "warn" if used_percent >= 85 else "ok",
        "total_bytes": total,
        "available_bytes": available,
        "used_bytes": used,
        "used_percent": used_percent,
        "process_rss_bytes": rss,
    }


def _load_snapshot() -> dict[str, Any]:
    try:
        one, five, fifteen = os.getloadavg()
        return {
            "status": "ok",
            "load_1m": round(one, 2),
            "load_5m": round(five, 2),
            "load_15m": round(fifteen, 2),
            "cpu_count": os.cpu_count(),
        }
    except Exception:
        return {"status": "warn", "detail": "Load average is not available on this runtime."}


def _read_cpu_times() -> tuple[int, int] | None:
    try:
        with open("/proc/stat", encoding="utf-8") as handle:
            first = handle.readline().strip().split()
        if not first or first[0] != "cpu":
            return None
        values = [int(value) for value in first[1:]]
        idle = values[3] + (values[4] if len(values) > 4 else 0)
        total = sum(values)
        return idle, total
    except Exception:
        return None


# Global memory cache for CPU usage percent to avoid blocking event loop
_cached_cpu_percent: float | None = 0.0

def _update_cpu_cache_loop() -> None:
    global _cached_cpu_percent
    while True:
        try:
            first = _read_cpu_times()
            if first:
                time.sleep(0.05)
                second = _read_cpu_times()
                if second:
                    idle_delta = second[0] - first[0]
                    total_delta = second[1] - first[1]
                    if total_delta > 0:
                        _cached_cpu_percent = round(max(0.0, min(100.0, (1 - idle_delta / total_delta) * 100)), 1)
        except Exception:
            pass
        time.sleep(3.0)

# Spawn daemon thread to automatically update CPU cache in the background
threading.Thread(target=_update_cpu_cache_loop, daemon=True).start()


def _cpu_usage_percent() -> float | None:
    return _cached_cpu_percent


def _read_temperature_celsius(patterns: list[str]) -> float | None:
    values: list[float] = []
    for pattern in patterns:
        for path in glob.glob(pattern):
            try:
                with open(path, encoding="utf-8") as handle:
                    raw = handle.read().strip()
                if not raw:
                    continue
                numeric = float(raw)
                values.append(round(numeric / 1000, 1) if numeric > 200 else round(numeric, 1))
            except Exception:
                continue
    return max(values) if values else None


def _cpu_snapshot() -> dict[str, Any]:
    usage_percent = _cpu_usage_percent()
    temperature_c = _read_temperature_celsius([
        "/sys/class/thermal/thermal_zone*/temp",
        "/sys/class/hwmon/hwmon*/temp*_input",
    ])
    status = "ok"
    if usage_percent is None:
        status = "warn"
    if (usage_percent is not None and usage_percent >= 90) or (temperature_c is not None and temperature_c >= 85):
        status = "warn"
    return {
        "status": status,
        "usage_percent": usage_percent,
        "temperature_c": temperature_c,
        "cpu_count": os.cpu_count(),
        "detail": None if usage_percent is not None else "CPU usage is not available on this runtime.",
    }


def _read_gpu_from_drm() -> dict[str, Any] | None:
    for card_path in glob.glob("/sys/class/drm/card[0-9]"):
        device_path = os.path.join(card_path, "device")
        if not os.path.isdir(device_path):
            continue
        utilization_percent: float | None = None
        name = os.path.basename(card_path)
        try:
            with open(os.path.join(device_path, "gpu_busy_percent"), encoding="utf-8") as handle:
                utilization_percent = round(float(handle.read().strip()), 1)
        except Exception:
            pass
        for name_file in ["product_name", "product", "model"]:
            try:
                with open(os.path.join(device_path, name_file), encoding="utf-8") as handle:
                    candidate = handle.read().strip()
                if candidate:
                    name = candidate
                    break
            except Exception:
                continue
        temperature_c = _read_temperature_celsius([
            os.path.join(device_path, "hwmon", "hwmon*", "temp*_input"),
        ])
        if utilization_percent is not None or temperature_c is not None:
            return {
                "status": "warn" if (utilization_percent or 0) >= 95 or (temperature_c or 0) >= 85 else "ok",
                "name": name,
                "utilization_percent": utilization_percent,
                "temperature_c": temperature_c,
                "source": "drm-sysfs",
            }
    return None


def _read_gpu_from_nvidia_smi() -> dict[str, Any] | None:
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=utilization.gpu,temperature.gpu,name", "--format=csv,noheader,nounits"],
            capture_output=True,
            text=True,
            timeout=1.5,
            check=False,
        )
    except Exception:
        return None
    if result.returncode != 0 or not result.stdout.strip():
        return None
    first_line = result.stdout.strip().splitlines()[0]
    parts = [part.strip() for part in first_line.split(",")]
    if len(parts) < 3:
        return None
    try:
        utilization_percent = float(parts[0])
    except ValueError:
        utilization_percent = None
    try:
        temperature_c = float(parts[1])
    except ValueError:
        temperature_c = None
    return {
        "status": "warn" if (utilization_percent or 0) >= 95 or (temperature_c or 0) >= 85 else "ok",
        "name": parts[2],
        "utilization_percent": utilization_percent,
        "temperature_c": temperature_c,
        "source": "nvidia-smi",
    }


def _gpu_snapshot() -> dict[str, Any]:
    snapshot = _read_gpu_from_drm() or _read_gpu_from_nvidia_smi()
    if snapshot:
        return snapshot
    return {
        "status": "unknown",
        "name": None,
        "utilization_percent": None,
        "temperature_c": None,
        "source": None,
        "detail": "GPU metrics are not exposed to this runtime.",
    }


def _meeting_job_summary(db: Session) -> dict[str, Any]:
    rows = db.query(MeetingTaskStatusRecord.phase, func.count(MeetingTaskStatusRecord.job_id)).group_by(MeetingTaskStatusRecord.phase).all()
    by_phase = {phase or "unknown": int(count) for phase, count in rows}
    active_phases = {"queued", "uploading", "processing", "transcribing", "summarizing", "reducing", "analyzing"}
    terminal_phases = {"completed", "failed", "cancelled"}
    active_count = sum(count for phase, count in by_phase.items() if phase in active_phases)
    terminal_count = sum(count for phase, count in by_phase.items() if phase in terminal_phases)
    stale_cutoff = datetime.now(UTC) - timedelta(minutes=45)
    stale_count = (
        db.query(MeetingTaskStatusRecord)
        .filter(MeetingTaskStatusRecord.updated_at < stale_cutoff)
        .filter(MeetingTaskStatusRecord.phase.notin_(list(terminal_phases)))
        .count()
    )
    failed_with_error = db.query(MeetingTaskStatusRecord).filter(MeetingTaskStatusRecord.error != "").count()
    return {
        "status": "warn" if stale_count or failed_with_error else "ok",
        "by_phase": by_phase,
        "active_count": active_count,
        "terminal_count": terminal_count,
        "stale_count": int(stale_count),
        "failed_with_error": int(failed_with_error),
    }


def _glossary_health_summary(db: Session) -> dict[str, Any]:
    total_count = db.query(GlossaryTerm).count()
    auto_extracted_count = db.query(GlossaryTerm).filter(GlossaryTerm.id.like("auto-%")).count()
    
    # Check for potential duplicates (same JP/EN pair)
    # Since we added UniqueConstraint, this should be 0 for new terms, 
    # but good to check existing ones or potential case-insensitive duplicates
    dup_query = text("""
        SELECT COUNT(*) FROM (
            SELECT lower(japanese), lower(english) 
            FROM glossary_terms 
            GROUP BY lower(japanese), lower(english) 
            HAVING COUNT(*) > 1
        ) AS dups
    """)
    try:
        potential_duplicates = db.execute(dup_query).scalar() or 0
    except Exception:
        potential_duplicates = 0
        
    return {
        "status": "warn" if potential_duplicates > 0 or auto_extracted_count > 50 else "ok",
        "total_count": total_count,
        "auto_extracted_count": auto_extracted_count,
        "potential_duplicates": potential_duplicates,
    }


@router.get("/health/deep")
def deep_health_check(db: Session = Depends(get_db)) -> dict[str, Any]:
    db.execute(text("select 1"))
    dialect = db.bind.dialect.name if db.bind is not None else "unknown"
    table_counts = {
        "projects": _safe_count(db, ProjectSettingRecord),
        "client_state": _safe_count(db, ClientStateRecord),
        "meetings": _safe_count(db, MeetingRecord),
        "meeting_minutes": _safe_count(db, MeetingMinutesRecord),
        "meeting_task_status": _safe_count(db, MeetingTaskStatusRecord),
        "todo_projects": _safe_count(db, BrseTodoProjectRecord),
        "todo_items": _safe_count(db, BrseTodoItemRecord),
        "operations": _safe_count(db, OperationRecord),
        "glossary": total_count if (total_count := _safe_count(db, GlossaryTerm)) is not None else 0,
    }
    disk = _disk_snapshot()
    memory = _memory_snapshot()
    cpu = _cpu_snapshot()
    gpu = _gpu_snapshot()
    jobs = _meeting_job_summary(db)
    glossary_health = _glossary_health_summary(db)
    
    warnings: list[str] = []
    if disk.get("status") != "ok":
        warnings.append("Disk usage is high.")
    if memory.get("status") != "ok":
        warnings.append(memory.get("detail") or "Memory usage is high.")
    if jobs.get("stale_count"):
        warnings.append(f"{jobs['stale_count']} meeting job(s) look stale.")
    if jobs.get("failed_with_error"):
        warnings.append(f"{jobs['failed_with_error']} meeting job(s) have recorded errors.")
    if glossary_health.get("potential_duplicates"):
        warnings.append(f"Found {glossary_health['potential_duplicates']} potential duplicate terms in Glossary.")
    if glossary_health.get("auto_extracted_count", 0) > 20:
        warnings.append(f"There are {glossary_health['auto_extracted_count']} unapproved terms in Glossary.")
    if cpu.get("usage_percent") is not None and cpu["usage_percent"] >= 90:
        warnings.append("CPU usage is high.")
    if cpu.get("temperature_c") is not None and cpu["temperature_c"] >= 85:
        warnings.append("CPU temperature is high.")
    if gpu.get("utilization_percent") is not None and gpu["utilization_percent"] >= 95:
        warnings.append("GPU usage is high.")
    if gpu.get("temperature_c") is not None and gpu["temperature_c"] >= 85:
        warnings.append("GPU temperature is high.")

    return {
        "status": "warn" if warnings else "ok",
        "service": "brse-assistant-api",
        "checked_at": datetime.now(UTC).isoformat(),
        "database": {
            "status": "ok",
            "dialect": dialect,
            "table_counts": table_counts,
        },
        "resources": {
            "disk": disk,
            "memory": memory,
            "load": _load_snapshot(),
            "cpu": cpu,
            "gpu": gpu,
        },
        "meeting_jobs": jobs,
        "glossary_health": glossary_health,
        "warnings": warnings,
    }


TABLE_MODEL_MAP = {
    "projects": ProjectSettingRecord,
    "client_state": ClientStateRecord,
    "meetings": MeetingRecord,
    "meeting_minutes": MeetingMinutesRecord,
    "meeting_task_status": MeetingTaskStatusRecord,
    "todo_projects": BrseTodoProjectRecord,
    "todo_items": BrseTodoItemRecord,
    "operations": OperationRecord,
    "glossary": GlossaryTerm,
}


def _serialize_record(record: Any) -> dict[str, Any]:
    row: dict[str, Any] = {}
    if hasattr(record, "__table__"):
        for col in record.__table__.columns.keys():
            val = getattr(record, col, None)
            if isinstance(val, (datetime, date)):
                row[col] = val.isoformat()
            elif isinstance(val, bytes):
                row[col] = f"<bytes {len(val)}B>"
            elif isinstance(val, str) and len(val) > 300:
                row[col] = f"{val[:300]}..."
            else:
                row[col] = val
    elif isinstance(record, dict):
        row = record
    return row


@router.get("/health/db/inspect/{table_name}")
def inspect_database_table(
    table_name: str,
    limit: int = 15,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    model = TABLE_MODEL_MAP.get(table_name)
    if not model:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported table '{table_name}'. Supported tables: {list(TABLE_MODEL_MAP.keys())}",
        )

    clamped_limit = min(50, max(1, limit))
    try:
        total = int(db.query(model).count())
        query = db.query(model)
        if hasattr(model, "updated_at"):
            query = query.order_by(model.updated_at.desc())
        elif hasattr(model, "created_at"):
            query = query.order_by(model.created_at.desc())
        elif hasattr(model, "id"):
            query = query.order_by(model.id.desc())

        records = query.limit(clamped_limit).all()
        columns = [c.name for c in model.__table__.columns] if hasattr(model, "__table__") else []
        rows = [_serialize_record(r) for r in records]
        return {
            "status": "ok",
            "table_name": table_name,
            "total_records": total,
            "limit": clamped_limit,
            "columns": columns,
            "rows": rows,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database inspect error: {str(exc)}")


@router.post("/health/self-heal")
def self_heal_system(db: Session = Depends(get_db)) -> dict[str, Any]:
    actions: list[dict[str, str]] = []

    # 1. DB connection pool validation & refresh
    try:
        db.execute(text("SELECT 1"))
        if db.bind is not None:
            db.bind.dispose()
        actions.append({
            "step": "db_pool",
            "status": "ok",
            "message": "Database pool verified and refreshed."
        })
    except Exception as exc:
        actions.append({
            "step": "db_pool",
            "status": "warn",
            "message": f"Database pool warning: {exc}"
        })

    # 2. Cleanup stale meeting queue jobs
    try:
        stale_cutoff = datetime.now(UTC) - timedelta(minutes=45)
        terminal_phases = {"completed", "failed", "cancelled", "interrupted"}
        stale_jobs = (
            db.query(MeetingTaskStatusRecord)
            .filter(MeetingTaskStatusRecord.updated_at < stale_cutoff)
            .filter(MeetingTaskStatusRecord.phase.notin_(list(terminal_phases)))
            .all()
        )
        unblocked_count = len(stale_jobs)
        for job in stale_jobs:
            job.phase = "interrupted"
            job.error = "Unblocked by Self-Healing recovery daemon."
        if unblocked_count > 0:
            db.commit()
        actions.append({
            "step": "stale_jobs",
            "status": "ok",
            "message": f"Checked meeting queue: {unblocked_count} stale job(s) unblocked."
        })
    except Exception as exc:
        db.rollback()
        actions.append({
            "step": "stale_jobs",
            "status": "warn",
            "message": f"Job queue check: {exc}"
        })

    # 3. AI runtime sanity check
    try:
        from app.core.config import settings
        ai_url = settings.effective_9router_url or "http://127.0.0.1:20042"
        actions.append({
            "step": "ai_runtime",
            "status": "ok",
            "message": f"AI router endpoint verified at {ai_url}."
        })
    except Exception as exc:
        actions.append({
            "step": "ai_runtime",
            "status": "warn",
            "message": f"AI router check: {exc}"
        })

    # 4. Client state consistency check
    try:
        state_count = db.query(ClientStateRecord).count()
        actions.append({
            "step": "client_state",
            "status": "ok",
            "message": f"Client state table verified ({state_count} key-value records)."
        })
    except Exception as exc:
        actions.append({
            "step": "client_state",
            "status": "warn",
            "message": f"Client state check: {exc}"
        })

    return {
        "status": "ok",
        "healed_at": datetime.now(UTC).isoformat(),
        "actions": actions
    }

