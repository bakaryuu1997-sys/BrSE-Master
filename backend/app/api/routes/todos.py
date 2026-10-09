import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.todo import BrseTodoItemRecord, BrseTodoProjectRecord
from app.schemas.todo import (
    BrseTodoItemCreate,
    BrseTodoItemRead,
    BrseTodoItemUpdate,
    BrseTodoProjectCreate,
    BrseTodoProjectRead,
    BrseTodoProjectUpdate,
    BrseTodoRuleEvaluationRequest,
    BrseTodoStateRead,
    BrseTodoStateWrite,
)
from app.services.brse_todo_rules import evaluate_todo_rules, todo_item_to_rule_dict

router = APIRouter()


def encode_presets(value: list[str] | None) -> str:
    return json.dumps(value or [], ensure_ascii=False)


def decode_presets(value: str | None) -> list[str]:
    try:
        parsed = json.loads(value or "[]")
    except json.JSONDecodeError:
        return []
    return parsed if isinstance(parsed, list) else []


def decode_evidences(value: str | None) -> list[dict]:
    try:
        parsed = json.loads(value or "[]")
    except json.JSONDecodeError:
        return []
    return parsed if isinstance(parsed, list) else []


def serialize_project(record: BrseTodoProjectRecord) -> dict:
    return {
        "id": record.id,
        "name": record.name,
        "preset": record.preset or "standard",
        "active_phase": record.active_phase or "1. Kick-off & Requirement",
        "archived_at": record.archived_at or "",
        "created_at": record.created_at,
        "updated_at": record.updated_at,
    }


def serialize_item(record: BrseTodoItemRecord) -> dict:
    return {
        "id": record.id,
        "project_id": record.project_id,
        "phase": record.phase,
        "title": record.title,
        "detail": record.detail or "",
        "priority": record.priority or "P1",
        "presets": decode_presets(record.presets),
        "done": bool(record.done),
        "note": record.note or "",
        "deadline": record.deadline or "",
        "evidence_url": record.evidence_url or "",
        "evidences": decode_evidences(getattr(record, "evidences_json", "[]")),
        "operation_id": record.operation_id or "",
        "source": record.source or "workflow",
        "meeting_id": record.meeting_id or "",
        "meeting_title": record.meeting_title or "",
        "action_index": record.action_index,
        "updated_at_client": record.updated_at_client or "",
        "created_at": record.created_at,
        "updated_at": record.updated_at,
    }


def upsert_project(db: Session, payload: BrseTodoProjectCreate) -> BrseTodoProjectRecord:
    project_id = payload.id or None
    record = db.query(BrseTodoProjectRecord).filter(BrseTodoProjectRecord.id == project_id).first() if project_id else None
    if not record:
        record = BrseTodoProjectRecord(id=project_id) if project_id else BrseTodoProjectRecord()
        db.add(record)
    record.name = payload.name.strip() or "Personal project"
    record.preset = payload.preset or "standard"
    record.active_phase = payload.active_phase or "1. Kick-off & Requirement"
    record.archived_at = payload.archived_at or ""
    return record


def upsert_item(db: Session, project_id: str, payload: BrseTodoItemCreate) -> BrseTodoItemRecord:
    record = (
        db.query(BrseTodoItemRecord)
        .filter(BrseTodoItemRecord.id == payload.id, BrseTodoItemRecord.project_id == project_id)
        .first()
    )
    if not record:
        record = BrseTodoItemRecord(id=payload.id, project_id=project_id)
        db.add(record)
    record.phase = payload.phase
    record.title = payload.title
    record.detail = payload.detail
    record.priority = payload.priority
    record.presets = encode_presets(payload.presets)
    record.done = payload.done
    record.note = payload.note
    record.deadline = payload.deadline
    record.evidence_url = payload.evidence_url
    if payload.evidences is not None:
        record.evidences_json = json.dumps(payload.evidences, ensure_ascii=False)
    record.operation_id = payload.operation_id
    record.source = payload.source
    record.meeting_id = payload.meeting_id
    record.meeting_title = payload.meeting_title
    record.action_index = payload.action_index
    record.updated_at_client = payload.updated_at_client
    return record


@router.post("/rules/evaluate")
def evaluate_todo_rule_payload(payload: BrseTodoRuleEvaluationRequest):
    items = [
        {
            "id": item.id,
            "project_id": "",
            "phase": item.phase,
            "title": item.title,
            "detail": item.detail,
            "priority": item.priority,
            "done": item.done,
            "deadline": item.deadline,
            "source": item.source,
            "operation_id": item.operation_id,
            "meeting_id": item.meeting_id,
            "meeting_title": item.meeting_title,
        }
        for item in payload.items
    ]
    return evaluate_todo_rules(items, today=payload.today)


@router.get("/projects", response_model=list[BrseTodoProjectRead])
def list_todo_projects(db: Session = Depends(get_db)):
    records = db.query(BrseTodoProjectRecord).order_by(BrseTodoProjectRecord.updated_at.desc()).all()
    return [serialize_project(record) for record in records]


@router.post("/projects", response_model=BrseTodoProjectRead, status_code=201)
def create_todo_project(payload: BrseTodoProjectCreate, db: Session = Depends(get_db)):
    record = upsert_project(db, payload)
    db.commit()
    db.refresh(record)
    return serialize_project(record)


@router.put("/projects/{project_id}", response_model=BrseTodoProjectRead)
def update_todo_project(project_id: str, payload: BrseTodoProjectUpdate, db: Session = Depends(get_db)):
    record = db.query(BrseTodoProjectRecord).filter(BrseTodoProjectRecord.id == project_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Todo project not found")
    update_data = payload.model_dump(exclude_unset=True)
    if "name" in update_data:
        record.name = (update_data["name"] or "").strip() or "Personal project"
    if "preset" in update_data:
        record.preset = update_data["preset"] or "standard"
    if "active_phase" in update_data:
        record.active_phase = update_data["active_phase"] or "1. Kick-off & Requirement"
    if "archived_at" in update_data:
        record.archived_at = update_data["archived_at"] or ""
    db.commit()
    db.refresh(record)
    return serialize_project(record)


@router.delete("/projects/{project_id}")
def delete_todo_project(project_id: str, db: Session = Depends(get_db)):
    record = db.query(BrseTodoProjectRecord).filter(BrseTodoProjectRecord.id == project_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Todo project not found")
    db.query(BrseTodoItemRecord).filter(BrseTodoItemRecord.project_id == project_id).delete()
    db.delete(record)
    db.commit()
    return {"message": "Todo project deleted"}


@router.get("/projects/{project_id}/state", response_model=BrseTodoStateRead)
def get_todo_state(project_id: str, db: Session = Depends(get_db)):
    project = db.query(BrseTodoProjectRecord).filter(BrseTodoProjectRecord.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Todo project not found")
    items = (
        db.query(BrseTodoItemRecord)
        .filter(BrseTodoItemRecord.project_id == project_id)
        .order_by(BrseTodoItemRecord.phase.asc(), BrseTodoItemRecord.priority.asc(), BrseTodoItemRecord.title.asc())
        .all()
    )
    return {"project": serialize_project(project), "items": [serialize_item(item) for item in items]}


@router.get("/projects/{project_id}/rules")
def evaluate_todo_project_rules(project_id: str, today: str | None = None, db: Session = Depends(get_db)):
    project = db.query(BrseTodoProjectRecord).filter(BrseTodoProjectRecord.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Todo project not found")
    items = (
        db.query(BrseTodoItemRecord)
        .filter(BrseTodoItemRecord.project_id == project_id)
        .order_by(BrseTodoItemRecord.phase.asc(), BrseTodoItemRecord.priority.asc(), BrseTodoItemRecord.title.asc())
        .all()
    )
    result = evaluate_todo_rules([todo_item_to_rule_dict(item) for item in items], today=today)
    result["project"] = serialize_project(project)
    return result


@router.post("/projects/{project_id}/items", response_model=BrseTodoItemRead, status_code=201)
def create_todo_item(project_id: str, payload: BrseTodoItemCreate, db: Session = Depends(get_db)):
    project = db.query(BrseTodoProjectRecord).filter(BrseTodoProjectRecord.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Todo project not found")
    record = upsert_item(db, project_id, payload)
    db.commit()
    db.refresh(record)
    return serialize_item(record)


@router.put("/projects/{project_id}/state", response_model=BrseTodoStateRead)
def replace_todo_state(project_id: str, payload: BrseTodoStateWrite, db: Session = Depends(get_db)):
    project_payload = payload.project.model_copy(update={"id": project_id})
    project = upsert_project(db, project_payload)
    db.flush()
    incoming_ids = {item.id for item in payload.items}
    stale_query = db.query(BrseTodoItemRecord).filter(BrseTodoItemRecord.project_id == project_id)
    if incoming_ids:
        stale_query = stale_query.filter(BrseTodoItemRecord.id.notin_(incoming_ids))
    stale_query.delete(synchronize_session=False)
    for item in payload.items:
        upsert_item(db, project_id, item)
    db.commit()
    db.refresh(project)
    items = db.query(BrseTodoItemRecord).filter(BrseTodoItemRecord.project_id == project_id).all()
    return {"project": serialize_project(project), "items": [serialize_item(item) for item in items]}


@router.put("/projects/{project_id}/items/{item_id}", response_model=BrseTodoItemRead)
def update_todo_item(project_id: str, item_id: str, payload: BrseTodoItemUpdate, db: Session = Depends(get_db)):
    record = (
        db.query(BrseTodoItemRecord)
        .filter(BrseTodoItemRecord.id == item_id, BrseTodoItemRecord.project_id == project_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Todo item not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "presets":
            record.presets = encode_presets(value)
        elif field == "evidences":
            record.evidences_json = json.dumps(value or [], ensure_ascii=False)
        else:
            setattr(record, field, value if field in {"done", "action_index"} else value or "")
    db.commit()
    db.refresh(record)
    return serialize_item(record)


@router.delete("/projects/{project_id}/items/{item_id}")
def delete_todo_item(project_id: str, item_id: str, db: Session = Depends(get_db)):
    record = (
        db.query(BrseTodoItemRecord)
        .filter(BrseTodoItemRecord.id == item_id, BrseTodoItemRecord.project_id == project_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Todo item not found")
    db.delete(record)
    db.commit()
    return {"message": "Todo item deleted"}
