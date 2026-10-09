import json
import os
import re
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.constants import PriorityEnum, PhasePressureThresholds, DeadlinePressureThresholds
from app.models.meeting import MeetingRecord
from app.models.todo import BrseTodoItemRecord, BrseTodoProjectRecord, MeetingTodoDraftRecord


def meeting_todo_slug(value: str) -> str:
    cleaned = re.sub(r"[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+", "-", value.lower()).strip("-")
    return cleaned[:48] or "follow-up"


def is_useful_action_task(task: str) -> bool:
    normalized = " ".join(task.strip().split())
    lowered = normalized.lower()
    if len(normalized) < 12 or len(normalized) > 220:
        return False
    noisy_patterns = [
        "synthesize them into one complete meeting note",
        "review final memo",
        "review consolidated follow-up",
        "review follow-up tasks",
        "## action items",
        "### action items",
        "[speaker]",
    ]
    return not any(pattern in lowered for pattern in noisy_patterns)


def _phase_deadline_pressure(phase_label: str) -> float:
    """Higher pressure means near deadlines should surface as P0 more often."""
    label = (phase_label or "").lower()
    if "uat" in label or "testing" in label or "closure" in label or "6." in label or "7." in label:
        return PhasePressureThresholds.UAT_CLOSURE
    if "q&a" in label or "tracking" in label or "4." in label or "5." in label:
        return PhasePressureThresholds.QA_TRACKING
    if "requirement" in label or "analysis" in label or "3." in label:
        return PhasePressureThresholds.REQUIREMENT_ANALYSIS
    if "communication" in label or "2." in label:
        return PhasePressureThresholds.COMMUNICATION
    if "kick" in label or "1." in label:
        return PhasePressureThresholds.KICKOFF
    return PhasePressureThresholds.DEFAULT


def priority_for_action(action: dict[str, Any], project_active_phase: str = "") -> str:
    today = datetime.now(UTC).date().isoformat()
    text = f"{action.get('task', '')} {action.get('status', '')}".lower()
    deadline_raw = str(action.get("deadline", "") or "").strip()
    if deadline_raw and deadline_raw <= today:
        return PriorityEnum.P0
    if re.search(r"urgent|block|critical|緊急|至急|重要|blocker", text):
        return PriorityEnum.P0

    pressure = _phase_deadline_pressure(project_active_phase)
    if not deadline_raw:
        return PriorityEnum.P2

    try:
        dline = datetime.fromisoformat(deadline_raw).date()
        today_d = datetime.fromisoformat(today).date()
        days = (dline - today_d).days
    except ValueError:
        return PriorityEnum.P1

    if days < 0:
        return PriorityEnum.P0
    if days == 0:
        return PriorityEnum.P0 if pressure >= DeadlinePressureThresholds.URGENT_THRESHOLD else PriorityEnum.P1
    if days == 1:
        if pressure >= DeadlinePressureThresholds.HIGH_PRESSURE_THRESHOLD:
            return PriorityEnum.P0
        if pressure >= DeadlinePressureThresholds.URGENT_THRESHOLD:
            return PriorityEnum.P1
        return PriorityEnum.P2
    if days <= 3:
        if pressure >= DeadlinePressureThresholds.EXTREME_PRESSURE_THRESHOLD:
            return PriorityEnum.P0
        if pressure >= DeadlinePressureThresholds.MODERATE_PRESSURE_THRESHOLD:
            return PriorityEnum.P1
        return PriorityEnum.P2
    if days <= 7:
        return PriorityEnum.P1 if pressure >= DeadlinePressureThresholds.MODERATE_PRESSURE_THRESHOLD else PriorityEnum.P2
    return PriorityEnum.P2


def get_or_create_meeting_todo_project(db: Session) -> BrseTodoProjectRecord:
    project = (
        db.query(BrseTodoProjectRecord)
        .filter(BrseTodoProjectRecord.archived_at == "")
        .order_by(BrseTodoProjectRecord.updated_at.desc())
        .first()
    )
    if project:
        return project
    project = BrseTodoProjectRecord(
        id="personal",
        name="Personal project",
        preset="standard",
        active_phase="4. Tracking & Reporting",
        archived_at="",
    )
    db.add(project)
    db.flush()
    return project


def meeting_analysis_meta_path(job_id: str) -> str:
    return os.path.join(settings.memo_folder, "_meta", f"{job_id}.analysis.json")


def read_meeting_analysis(job_id: str) -> dict[str, Any]:
    path = meeting_analysis_meta_path(job_id)
    if not os.path.exists(path):
        return {}
    try:
        with open(path, encoding="utf-8") as file:
            data = json.load(file)
    except (json.JSONDecodeError, OSError):
        return {}
    return data if isinstance(data, dict) else {}


def read_meeting_actions(job_id: str) -> list[dict[str, Any]]:
    actions = read_meeting_analysis(job_id).get("actions")
    return actions if isinstance(actions, list) else []


def meeting_action_fingerprint(meeting_id: str, action_index: int, task: str) -> str:
    return f"meeting-{meeting_id}-action-{action_index}-{meeting_todo_slug(task)}"


def action_source_quote(action: dict[str, Any], meeting: MeetingRecord) -> str:
    candidates = [
        action.get("quote"),
        action.get("evidence"),
        action.get("context"),
        action.get("source"),
        action.get("task"),
    ]
    quote = next((str(value).strip() for value in candidates if value), "")
    if not quote:
        quote = meeting.title
    return quote[:1000]


def create_meeting_action_drafts(db: Session, meeting: MeetingRecord, analysis: dict[str, Any]) -> int:
    actions = analysis.get("actions")
    if not isinstance(actions, list):
        return 0

    project = get_or_create_meeting_todo_project(db)
    active_phase = (project.active_phase or "").strip() or "4. Tracking & Reporting"
    existing_draft_ids = {
        draft.id
        for draft in db.query(MeetingTodoDraftRecord).filter(MeetingTodoDraftRecord.meeting_id == meeting.id).all()
    }
    existing_todo_keys = {
        (item.meeting_id, item.action_index)
        for item in db.query(BrseTodoItemRecord).filter(BrseTodoItemRecord.meeting_id == meeting.id).all()
    }

    created = 0
    for index, action in enumerate(actions):
        if not isinstance(action, dict) or (meeting.id, index) in existing_todo_keys:
            continue
        task = str(action.get("task", "")).strip()
        if not is_useful_action_task(task):
            continue
        draft_id = meeting_action_fingerprint(meeting.id, index, task)
        if draft_id in existing_draft_ids:
            continue
        draft = MeetingTodoDraftRecord(
            id=draft_id,
            project_id=project.id,
            project_name=project.name,
            meeting_id=meeting.id,
            meeting_title=meeting.title,
            action_index=index,
            task=task[:320],
            owner=str(action.get("owner", "") or "")[:160],
            deadline=str(action.get("deadline", "") or "")[:20],
            action_status=str(action.get("status", "") or "")[:80],
            source_quote=action_source_quote(action, meeting),
            evidence_url=f"meeting:{meeting.id}",
            priority=priority_for_action(action, active_phase),
            phase=active_phase,
            review_status="pending",
        )
        db.add(draft)
        existing_draft_ids.add(draft_id)
        created += 1
    if created:
        db.flush()
    return created


def serialize_meeting_todo_draft(draft: MeetingTodoDraftRecord) -> dict[str, Any]:
    return {
        "id": draft.id,
        "project_id": draft.project_id,
        "project_name": draft.project_name,
        "meeting_id": draft.meeting_id,
        "meeting_title": draft.meeting_title,
        "action_index": draft.action_index,
        "task": draft.task,
        "owner": draft.owner or "",
        "deadline": draft.deadline or "",
        "action_status": draft.action_status or "",
        "source_quote": draft.source_quote or "",
        "evidence_url": draft.evidence_url or "",
        "priority": draft.priority or "P1",
        "phase": draft.phase or "4. Tracking & Reporting",
        "review_status": draft.review_status or "pending",
        "todo_item_id": draft.todo_item_id or "",
        "created_at": draft.created_at.isoformat() if draft.created_at else "",
        "updated_at": draft.updated_at.isoformat() if draft.updated_at else "",
    }


def approve_meeting_todo_draft(db: Session, draft: MeetingTodoDraftRecord) -> BrseTodoItemRecord:
    project = get_or_create_meeting_todo_project(db)
    if draft.project_id and draft.project_id != project.id:
        project = db.query(BrseTodoProjectRecord).filter(BrseTodoProjectRecord.id == draft.project_id).first() or project

    item_id = draft.todo_item_id or draft.id
    record = (
        db.query(BrseTodoItemRecord)
        .filter(BrseTodoItemRecord.id == item_id, BrseTodoItemRecord.project_id == project.id)
        .first()
    )
    if not record:
        record = BrseTodoItemRecord(id=item_id, project_id=project.id)
        db.add(record)

    detail = "\n".join(
        value
        for value in [
            f"Meeting: {draft.meeting_title}",
            f"Owner: {draft.owner}" if draft.owner else "",
            f"Status: {draft.action_status}" if draft.action_status else "",
            f"Evidence: {draft.evidence_url}" if draft.evidence_url else "",
            f"Quote: {draft.source_quote}" if draft.source_quote else "",
        ]
        if value
    )
    record.phase = draft.phase or project.active_phase or "4. Tracking & Reporting"
    record.title = draft.task[:320]
    record.detail = detail
    record.priority = draft.priority or "P1"
    record.presets = json.dumps(["standard", "web", "mobile", "migration", "maintenance"], ensure_ascii=False)
    record.done = False
    record.note = "Approved from Meeting Todo Draft Review Queue."
    record.deadline = draft.deadline or ""
    record.evidence_url = draft.evidence_url or f"meeting:{draft.meeting_id}"
    record.operation_id = ""
    record.source = "meeting"
    record.meeting_id = draft.meeting_id
    record.meeting_title = draft.meeting_title
    record.action_index = draft.action_index
    record.updated_at_client = datetime.now(UTC).isoformat()

    draft.review_status = "approved"
    draft.todo_item_id = record.id
    db.flush()
    return record


def ensure_recent_meeting_action_drafts(db: Session, limit: int = 12) -> int:
    meetings = (
        db.query(MeetingRecord)
        .filter(MeetingRecord.status == "completed")
        .order_by(MeetingRecord.completed_at.desc().nullslast(), MeetingRecord.created_at.desc())
        .limit(limit)
        .all()
    )
    created = 0
    for meeting in meetings:
        created += create_meeting_action_drafts(db, meeting, read_meeting_analysis(meeting.id))
    return created


def sync_recent_completed_meeting_actions_to_todo(db: Session, limit: int = 12) -> tuple[int, BrseTodoProjectRecord]:
    project = get_or_create_meeting_todo_project(db)
    ensure_recent_meeting_action_drafts(db, limit=limit)
    pending_drafts = (
        db.query(MeetingTodoDraftRecord)
        .filter(MeetingTodoDraftRecord.review_status == "pending")
        .order_by(MeetingTodoDraftRecord.created_at.asc())
        .limit(limit)
        .all()
    )
    created = 0
    for draft in pending_drafts:
        before_id = draft.todo_item_id
        approve_meeting_todo_draft(db, draft)
        if not before_id:
            created += 1
    if pending_drafts:
        db.flush()
    return created, project
