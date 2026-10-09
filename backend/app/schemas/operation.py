from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class OperationRecordBase(BaseModel):
    type: str
    title: str
    status: str
    priority: str
    owner: Optional[str] = None
    due_date: Optional[str] = None
    customer_owner: Optional[str] = None
    project_name: Optional[str] = None
    field_a: Optional[str] = None
    field_b: Optional[str] = None
    field_c: Optional[str] = None
    field_d: Optional[str] = None
    field_e: Optional[str] = None

class OperationRecordCreate(OperationRecordBase):
    pass

class OperationRecordUpdate(OperationRecordBase):
    pass

class OperationRecordResponse(OperationRecordBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime


class OperationDecisionLogBase(BaseModel):
    title: str
    decision: str = ""
    owner: str = ""
    decision_date: str = ""
    impact: str = ""
    evidence_url: str = ""
    related_record_id: str = ""
    project_name: str = ""


class OperationDecisionLogCreate(OperationDecisionLogBase):
    pass


class OperationDecisionLogUpdate(OperationDecisionLogBase):
    pass


class OperationDecisionLogResponse(OperationDecisionLogBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime


class OperationReleaseGateBase(BaseModel):
    project_name: str
    release_date: str = ""
    uat_start: str = ""
    uat_end: str = ""
    qna_closed: bool = False
    critical_bug_closed: bool = False
    cr_reviewed: bool = False
    uat_passed: bool = False
    evidence_ready: bool = False
    customer_approved: bool = False
    deploy_note_ready: bool = False
    note: str = ""


class OperationReleaseGateUpsert(OperationReleaseGateBase):
    pass


class OperationReleaseGateResponse(OperationReleaseGateBase):
    model_config = ConfigDict(from_attributes=True)

    updated_at: datetime


class OperationDependencyLinkBase(BaseModel):
    project_name: str = ""
    source_id: str
    target_id: str
    relation: str = "related"
    note: str = ""


class OperationDependencyLinkCreate(OperationDependencyLinkBase):
    pass


class OperationDependencyLinkUpdate(OperationDependencyLinkBase):
    pass


class OperationDependencyLinkResponse(OperationDependencyLinkBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime


class OperationTestMatrixItemBase(BaseModel):
    project_name: str = ""
    requirement: str
    operation_id: str = ""
    test_case: str = ""
    expected_result: str = ""
    owner: str = ""
    uat_status: str = "Not Started"
    evidence_url: str = ""
    last_run_date: str = ""
    note: str = ""


class OperationTestMatrixItemCreate(OperationTestMatrixItemBase):
    pass


class OperationTestMatrixItemUpdate(OperationTestMatrixItemBase):
    pass


class OperationTestMatrixItemResponse(OperationTestMatrixItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime
