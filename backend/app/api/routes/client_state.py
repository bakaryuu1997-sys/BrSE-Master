import json
from datetime import UTC, datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.client_state import ClientStateRecord
from app.schemas.client_state import ClientStateEntry, ClientStateRead, ClientStateSnapshot, ClientStateSnapshotRead

router = APIRouter()

SNAPSHOT_KEY = "brse.os.snapshot.v1"
ALLOWED_PREFIXES = ("brse.",)
MAX_ENTRY_BYTES = 5 * 1024 * 1024
MAX_SNAPSHOT_BYTES = 25 * 1024 * 1024


def validate_state_key(key: str) -> str:
    cleaned = key.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="State key is required.")
    if len(cleaned) > 160:
        raise HTTPException(status_code=400, detail="State key is too long.")
    if cleaned != SNAPSHOT_KEY and not cleaned.startswith(ALLOWED_PREFIXES):
        raise HTTPException(status_code=400, detail="Only BrSE local state keys can be synced.")
    return cleaned


def validate_state_value(value: str, max_bytes: int = MAX_ENTRY_BYTES) -> str:
    if not isinstance(value, str):
        raise HTTPException(status_code=400, detail="State value must be a string.")
    if len(value.encode("utf-8")) > max_bytes:
        raise HTTPException(status_code=413, detail="State value is too large.")
    return value


def upsert_state(db: Session, key: str, value: str) -> ClientStateRecord:
    record = db.query(ClientStateRecord).filter(ClientStateRecord.key == key).first()
    if record:
        record.value = value
    else:
        record = ClientStateRecord(key=key, value=value)
        db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("", response_model=List[ClientStateRead])
def list_client_state(db: Session = Depends(get_db)):
    return db.query(ClientStateRecord).order_by(ClientStateRecord.updated_at.desc()).all()


@router.get("/entry/{key:path}", response_model=ClientStateRead)
def get_client_state(key: str, db: Session = Depends(get_db)):
    cleaned = validate_state_key(key)
    record = db.query(ClientStateRecord).filter(ClientStateRecord.key == cleaned).first()
    if not record:
        return {"key": cleaned, "value": "", "updated_at": datetime.now(UTC)}
    return record


@router.put("/entry/{key:path}", response_model=ClientStateRead)
def put_client_state(key: str, payload: ClientStateEntry, db: Session = Depends(get_db)):
    cleaned = validate_state_key(key)
    if payload.key and payload.key != cleaned:
        raise HTTPException(status_code=400, detail="Payload key does not match URL key.")
    value = validate_state_value(payload.value)
    return upsert_state(db, cleaned, value)


@router.post("/snapshot", response_model=ClientStateSnapshotRead)
def save_client_state_snapshot(payload: ClientStateSnapshot, db: Session = Depends(get_db)):
    items = {}
    for key, value in payload.items.items():
        cleaned = validate_state_key(key)
        items[cleaned] = validate_state_value(value)

    snapshot = {
        "version": payload.version,
        "exported_at": payload.exported_at,
        "saved_at": datetime.now(UTC).isoformat(),
        "items": items,
    }
    value = validate_state_value(json.dumps(snapshot, ensure_ascii=False), MAX_SNAPSHOT_BYTES)
    record = upsert_state(db, SNAPSHOT_KEY, value)
    return ClientStateSnapshotRead(version=payload.version, exported_at=payload.exported_at, items=items, saved_at=record.updated_at)


@router.get("/snapshot/current", response_model=ClientStateSnapshotRead)
def get_client_state_snapshot(db: Session = Depends(get_db)):
    record = db.query(ClientStateRecord).filter(ClientStateRecord.key == SNAPSHOT_KEY).first()
    if not record:
        raise HTTPException(status_code=404, detail="Client state snapshot not found.")
    try:
        payload = json.loads(record.value)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail="Stored snapshot is corrupted.") from exc
    items = payload.get("items") if isinstance(payload, dict) else None
    if not isinstance(items, dict):
        raise HTTPException(status_code=500, detail="Stored snapshot is invalid.")
    return ClientStateSnapshotRead(
        version=int(payload.get("version") or 1),
        exported_at=str(payload.get("exported_at") or ""),
        items={str(key): str(value) for key, value in items.items()},
        saved_at=record.updated_at,
    )
