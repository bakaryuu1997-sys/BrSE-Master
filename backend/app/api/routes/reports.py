from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.report import ReportRecord
from app.schemas.report import ReportRecordCreate, ReportRecordUpdate, ReportRecordResponse

router = APIRouter()


@router.get("/", response_model=List[ReportRecordResponse])
def get_reports(db: Session = Depends(get_db)):
    """Retrieve all daily report records, newest first."""
    records = db.query(ReportRecord).order_by(ReportRecord.report_date.desc()).all()
    return records


@router.post("/", response_model=ReportRecordResponse)
def create_report(report_in: ReportRecordCreate, db: Session = Depends(get_db)):
    """Create a new daily report record."""
    data = report_in.model_dump()
    db_obj = ReportRecord(**data)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


@router.put("/{report_id}", response_model=ReportRecordResponse)
def update_report(report_id: str, report_in: ReportRecordUpdate, db: Session = Depends(get_db)):
    """Update a report record."""
    db_obj = db.query(ReportRecord).filter(ReportRecord.id == report_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Report not found")

    update_data = report_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)

    db.commit()
    db.refresh(db_obj)
    return db_obj


@router.delete("/{report_id}", response_model=dict)
def delete_report(report_id: str, db: Session = Depends(get_db)):
    """Delete a report record."""
    db_obj = db.query(ReportRecord).filter(ReportRecord.id == report_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Report not found")

    db.delete(db_obj)
    db.commit()
    return {"status": "success", "message": "Report deleted"}
