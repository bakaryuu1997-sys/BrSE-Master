from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.operation import (
    OperationDecisionLog,
    OperationDependencyLink,
    OperationRecord,
    OperationReleaseGate,
    OperationTestMatrixItem,
)
from app.services.notification_service import trigger_operation_notification
from app.schemas.operation import (
    OperationDecisionLogCreate,
    OperationDecisionLogResponse,
    OperationDecisionLogUpdate,
    OperationDependencyLinkCreate,
    OperationDependencyLinkResponse,
    OperationDependencyLinkUpdate,
    OperationRecordCreate,
    OperationRecordResponse,
    OperationRecordUpdate,
    OperationReleaseGateResponse,
    OperationReleaseGateUpsert,
    OperationTestMatrixItemCreate,
    OperationTestMatrixItemResponse,
    OperationTestMatrixItemUpdate,
)

router = APIRouter()


def apply_update(db_obj, payload: dict):
    for field, value in payload.items():
        setattr(db_obj, field, value)

@router.get("", response_model=List[OperationRecordResponse])
def get_operations(db: Session = Depends(get_db)):
    """Retrieve all operation records."""
    records = db.query(OperationRecord).order_by(OperationRecord.created_at.desc()).all()
    return records

@router.post("", response_model=OperationRecordResponse, status_code=status.HTTP_201_CREATED)
def create_operation(op_in: OperationRecordCreate, db: Session = Depends(get_db)):
    """Create a new operation record."""
    op_data = op_in.model_dump()
    db_obj = OperationRecord(**op_data)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    
    # Trigger Webhook Notification
    trigger_operation_notification(
        project_name=db_obj.project_name,
        record_type=db_obj.type,
        title=db_obj.title,
        action="create",
        status=db_obj.status,
        owner=db_obj.owner,
        due_date=db_obj.due_date,
        db_session=db
    )
    
    return db_obj


@router.get("/decision-logs", response_model=List[OperationDecisionLogResponse])
def get_decision_logs(db: Session = Depends(get_db)):
    return db.query(OperationDecisionLog).order_by(OperationDecisionLog.updated_at.desc()).all()


@router.post("/decision-logs", response_model=OperationDecisionLogResponse, status_code=status.HTTP_201_CREATED)
def create_decision_log(payload: OperationDecisionLogCreate, db: Session = Depends(get_db)):
    db_obj = OperationDecisionLog(**payload.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


@router.put("/decision-logs/{decision_id}", response_model=OperationDecisionLogResponse)
def update_decision_log(decision_id: str, payload: OperationDecisionLogUpdate, db: Session = Depends(get_db)):
    db_obj = db.query(OperationDecisionLog).filter(OperationDecisionLog.id == decision_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Decision log not found")
    apply_update(db_obj, payload.model_dump(exclude_unset=True))
    db.commit()
    db.refresh(db_obj)
    return db_obj


@router.delete("/decision-logs/{decision_id}", response_model=dict)
def delete_decision_log(decision_id: str, db: Session = Depends(get_db)):
    db_obj = db.query(OperationDecisionLog).filter(OperationDecisionLog.id == decision_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Decision log not found")
    db.delete(db_obj)
    db.commit()
    return {"status": "success", "message": "Decision log deleted"}


@router.get("/release-gates/{project_name}", response_model=OperationReleaseGateResponse)
def get_release_gate(project_name: str, db: Session = Depends(get_db)):
    db_obj = db.query(OperationReleaseGate).filter(OperationReleaseGate.project_name == project_name).first()
    if db_obj:
        return db_obj
    db_obj = OperationReleaseGate(project_name=project_name)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


@router.put("/release-gates/{project_name}", response_model=OperationReleaseGateResponse)
def upsert_release_gate(project_name: str, payload: OperationReleaseGateUpsert, db: Session = Depends(get_db)):
    db_obj = db.query(OperationReleaseGate).filter(OperationReleaseGate.project_name == project_name).first()
    data = payload.model_dump(exclude_unset=True)
    data["project_name"] = project_name
    if not db_obj:
        db_obj = OperationReleaseGate(**data)
        db.add(db_obj)
    else:
        apply_update(db_obj, data)
    db.commit()
    db.refresh(db_obj)
    return db_obj


@router.get("/dependency-links", response_model=List[OperationDependencyLinkResponse])
def get_dependency_links(db: Session = Depends(get_db)):
    return db.query(OperationDependencyLink).order_by(OperationDependencyLink.updated_at.desc()).all()


@router.post("/dependency-links", response_model=OperationDependencyLinkResponse, status_code=status.HTTP_201_CREATED)
def create_dependency_link(payload: OperationDependencyLinkCreate, db: Session = Depends(get_db)):
    db_obj = OperationDependencyLink(**payload.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


@router.put("/dependency-links/{link_id}", response_model=OperationDependencyLinkResponse)
def update_dependency_link(link_id: str, payload: OperationDependencyLinkUpdate, db: Session = Depends(get_db)):
    db_obj = db.query(OperationDependencyLink).filter(OperationDependencyLink.id == link_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Dependency link not found")
    apply_update(db_obj, payload.model_dump(exclude_unset=True))
    db.commit()
    db.refresh(db_obj)
    return db_obj


@router.delete("/dependency-links/{link_id}", response_model=dict)
def delete_dependency_link(link_id: str, db: Session = Depends(get_db)):
    db_obj = db.query(OperationDependencyLink).filter(OperationDependencyLink.id == link_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Dependency link not found")
    db.delete(db_obj)
    db.commit()
    return {"status": "success", "message": "Dependency link deleted"}


@router.get("/test-matrix", response_model=List[OperationTestMatrixItemResponse])
def get_test_matrix_items(db: Session = Depends(get_db)):
    return db.query(OperationTestMatrixItem).order_by(OperationTestMatrixItem.updated_at.desc()).all()


@router.post("/test-matrix", response_model=OperationTestMatrixItemResponse, status_code=status.HTTP_201_CREATED)
def create_test_matrix_item(payload: OperationTestMatrixItemCreate, db: Session = Depends(get_db)):
    db_obj = OperationTestMatrixItem(**payload.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


@router.put("/test-matrix/{item_id}", response_model=OperationTestMatrixItemResponse)
def update_test_matrix_item(item_id: str, payload: OperationTestMatrixItemUpdate, db: Session = Depends(get_db)):
    db_obj = db.query(OperationTestMatrixItem).filter(OperationTestMatrixItem.id == item_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Test matrix item not found")
    apply_update(db_obj, payload.model_dump(exclude_unset=True))
    db.commit()
    db.refresh(db_obj)
    return db_obj


@router.delete("/test-matrix/{item_id}", response_model=dict)
def delete_test_matrix_item(item_id: str, db: Session = Depends(get_db)):
    db_obj = db.query(OperationTestMatrixItem).filter(OperationTestMatrixItem.id == item_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Test matrix item not found")
    db.delete(db_obj)
    db.commit()
    return {"status": "success", "message": "Test matrix item deleted"}

@router.put("/{op_id}", response_model=OperationRecordResponse)
def update_operation(op_id: str, op_in: OperationRecordUpdate, db: Session = Depends(get_db)):
    """Update an operation record."""
    db_obj = db.query(OperationRecord).filter(OperationRecord.id == op_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Record not found")
    
    update_data = op_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
        
    db.commit()
    db.refresh(db_obj)
    
    # Trigger Webhook Notification
    trigger_operation_notification(
        project_name=db_obj.project_name,
        record_type=db_obj.type,
        title=db_obj.title,
        action="update",
        status=db_obj.status,
        owner=db_obj.owner,
        due_date=db_obj.due_date,
        db_session=db
    )
    
    return db_obj

@router.delete("/{op_id}", response_model=dict)
def delete_operation(op_id: str, db: Session = Depends(get_db)):
    """Delete an operation record."""
    db_obj = db.query(OperationRecord).filter(OperationRecord.id == op_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Record not found")
        
    db.delete(db_obj)
    db.commit()
    return {"status": "success", "message": "Record deleted"}
