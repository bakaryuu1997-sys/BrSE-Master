from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.project import ProjectSettingRecord
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate

router = APIRouter()


@router.get("", response_model=list[ProjectRead])
def list_projects(db: Session = Depends(get_db)):
    return db.query(ProjectSettingRecord).order_by(ProjectSettingRecord.updated_at.desc()).all()


@router.post("", response_model=ProjectRead, status_code=201)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    record = ProjectSettingRecord(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.put("/{project_id}", response_model=ProjectRead)
def update_project(project_id: str, payload: ProjectUpdate, db: Session = Depends(get_db)):
    record = db.query(ProjectSettingRecord).filter(ProjectSettingRecord.id == project_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Project not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    record = db.query(ProjectSettingRecord).filter(ProjectSettingRecord.id == project_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(record)
    db.commit()
    return {"message": "Project deleted"}
