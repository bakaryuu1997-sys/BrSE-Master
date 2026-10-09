import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.email_history import EmailHistoryRecord
from app.schemas.email_history import EmailHistoryCreate, EmailHistoryRead

router = APIRouter()


def serialize_record(record: EmailHistoryRecord) -> EmailHistoryRead:
    try:
        variables = json.loads(record.variables or "{}")
    except json.JSONDecodeError:
        variables = {}
    return EmailHistoryRead(
        id=record.id,
        project_id=record.project_id or "default",
        template_id=record.template_id or "",
        template_title=record.template_title or "",
        category=record.category or "",
        subject=record.subject or "",
        body=record.body or "",
        variables=variables if isinstance(variables, dict) else {},
        created_at=record.created_at,
    )


@router.get("", response_model=List[EmailHistoryRead])
def list_email_history(
    project_id: str = Query("default"),
    q: str = Query(""),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(EmailHistoryRecord).filter(EmailHistoryRecord.project_id == project_id)
    if q.strip():
        pattern = f"%{q.strip()}%"
        query = query.filter(
            or_(
                EmailHistoryRecord.template_title.ilike(pattern),
                EmailHistoryRecord.category.ilike(pattern),
                EmailHistoryRecord.subject.ilike(pattern),
                EmailHistoryRecord.body.ilike(pattern),
            )
        )
    records = query.order_by(EmailHistoryRecord.created_at.desc()).offset(offset).limit(limit).all()
    return [serialize_record(record) for record in records]


@router.get("/{record_id}", response_model=EmailHistoryRead)
def get_email_history_record(record_id: str, db: Session = Depends(get_db)):
    record = db.query(EmailHistoryRecord).filter(EmailHistoryRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Email history record not found")
    return serialize_record(record)


@router.post("", response_model=EmailHistoryRead)
def create_email_history(payload: EmailHistoryCreate, db: Session = Depends(get_db)):
    record = EmailHistoryRecord(
        project_id=payload.project_id or "default",
        template_id=payload.template_id,
        template_title=payload.template_title,
        category=payload.category,
        subject=payload.subject,
        body=payload.body,
        variables=json.dumps(payload.variables or {}, ensure_ascii=False),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return serialize_record(record)


@router.delete("")
def clear_email_history(project_id: str = Query("default"), db: Session = Depends(get_db)):
    deleted = db.query(EmailHistoryRecord).filter(EmailHistoryRecord.project_id == project_id).delete()
    db.commit()
    return {"deleted": deleted}
