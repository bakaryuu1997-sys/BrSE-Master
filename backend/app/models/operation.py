from datetime import UTC, datetime
import uuid

from sqlalchemy import Boolean, Column, DateTime, String, Text

from app.db.base_class import Base

class OperationRecord(Base):
    __tablename__ = "operation_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    type = Column(String, index=True)  # qna, bug, cr
    title = Column(String, nullable=False)
    status = Column(String, index=True)
    priority = Column(String)
    owner = Column(String)
    due_date = Column(String, nullable=True)
    customer_owner = Column(String)
    project_name = Column(String, index=True)
    
    # Generic fields to support various operation types
    field_a = Column(String, nullable=True)
    field_b = Column(String, nullable=True)
    field_c = Column(String, nullable=True)
    field_d = Column(String, nullable=True)
    field_e = Column(String, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))


class OperationDecisionLog(Base):
    __tablename__ = "operation_decision_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    title = Column(String, nullable=False)
    decision = Column(Text, default="")
    owner = Column(String, default="")
    decision_date = Column(String, default="")
    impact = Column(Text, default="")
    evidence_url = Column(String, default="")
    related_record_id = Column(String(36), default="", index=True)
    project_name = Column(String, default="", index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))


class OperationReleaseGate(Base):
    __tablename__ = "operation_release_gates"

    project_name = Column(String, primary_key=True, index=True)
    release_date = Column(String, default="")
    uat_start = Column(String, default="")
    uat_end = Column(String, default="")
    qna_closed = Column(Boolean, default=False)
    critical_bug_closed = Column(Boolean, default=False)
    cr_reviewed = Column(Boolean, default=False)
    uat_passed = Column(Boolean, default=False)
    evidence_ready = Column(Boolean, default=False)
    customer_approved = Column(Boolean, default=False)
    deploy_note_ready = Column(Boolean, default=False)
    note = Column(Text, default="")
    updated_at = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))


class OperationDependencyLink(Base):
    __tablename__ = "operation_dependency_links"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    project_name = Column(String, default="", index=True)
    source_id = Column(String(36), default="", index=True)
    target_id = Column(String(36), default="", index=True)
    relation = Column(String, default="related")
    note = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))


class OperationTestMatrixItem(Base):
    __tablename__ = "operation_test_matrix_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    project_name = Column(String, default="", index=True)
    requirement = Column(String, nullable=False)
    operation_id = Column(String(36), default="", index=True)
    test_case = Column(Text, default="")
    expected_result = Column(Text, default="")
    owner = Column(String, default="")
    uat_status = Column(String, default="Not Started")
    evidence_url = Column(String, default="")
    last_run_date = Column(String, default="")
    note = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))
