import json
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.operation import OperationRecord
from app.models.power_tool import PowerToolsStateRecord
from app.models.schedule import PersonalScheduleRecord
from app.models.todo import BrseTodoItemRecord, BrseTodoProjectRecord, MeetingTodoDraftRecord
from app.services.meeting_todo_sync import (
    approve_meeting_todo_draft,
    ensure_recent_meeting_action_drafts,
    serialize_meeting_todo_draft,
    sync_recent_completed_meeting_actions_to_todo,
)

router = APIRouter()


def today_iso() -> str:
    return datetime.now(UTC).date().isoformat()


def parse_presets(value: str | None) -> list[str]:
    try:
        parsed = json.loads(value or "[]")
    except json.JSONDecodeError:
        return []
    return parsed if isinstance(parsed, list) else []


def todo_item_payload(item: BrseTodoItemRecord, project: BrseTodoProjectRecord | None = None) -> dict[str, Any]:
    return {
        "id": item.id,
        "project_id": item.project_id,
        "project_name": project.name if project else "",
        "phase": item.phase,
        "title": item.title,
        "detail": item.detail or "",
        "priority": item.priority or "P1",
        "presets": parse_presets(item.presets),
        "done": bool(item.done),
        "deadline": item.deadline or "",
        "evidence_url": item.evidence_url or "",
        "operation_id": item.operation_id or "",
        "meeting_id": item.meeting_id or "",
        "meeting_title": item.meeting_title or "",
        "action_index": item.action_index,
        "updated_at": item.updated_at_client or (item.updated_at.isoformat() if item.updated_at else ""),
    }


def operation_payload(record: OperationRecord) -> dict[str, Any]:
    return {
        "id": record.id,
        "type": record.type or "qna",
        "title": record.title,
        "status": record.status or "",
        "priority": record.priority or "",
        "owner": record.owner or "",
        "customer_owner": record.customer_owner or "",
        "project_name": record.project_name or "",
        "due_date": record.due_date or "",
        "field_a": record.field_a or "",
        "field_b": record.field_b or "",
        "created_at": record.created_at.isoformat() if record.created_at else "",
        "updated_at": record.updated_at.isoformat() if record.updated_at else "",
    }


def action_payload(kind: str, title: str, body: str, href: str, severity: int, data: dict[str, Any] | None = None) -> dict[str, Any]:
    return {
        "kind": kind,
        "title": title,
        "body": body,
        "href": href,
        "severity": severity,
        "data": data or {},
    }

def power_tools_open_high_risks(db: Session, project_id: str | None) -> list[dict[str, Any]]:
    query = db.query(PowerToolsStateRecord)
    if project_id:
        query = query.filter(PowerToolsStateRecord.project_id == project_id)
    records = query.order_by(PowerToolsStateRecord.updated_at.desc()).limit(5).all()
    risks: list[dict[str, Any]] = []
    score_map = {"Low": 1, "Medium": 2, "High": 3}
    for record in records:
        try:
            payload = json.loads(record.payload or "{}")
        except json.JSONDecodeError:
            continue
        for risk in payload.get("risks", []) if isinstance(payload, dict) else []:
            if not isinstance(risk, dict) or risk.get("status") == "Closed":
                continue
            score = score_map.get(str(risk.get("impact", "Medium")), 2) * score_map.get(str(risk.get("probability", "Medium")), 2)
            if score >= 6:
                risks.append({
                    "project_id": record.project_id,
                    "title": str(risk.get("title", "")),
                    "impact": str(risk.get("impact", "")),
                    "probability": str(risk.get("probability", "")),
                    "mitigation": str(risk.get("mitigation", "")),
                    "status": str(risk.get("status", "")),
                    "score": score,
                })
    return risks[:8]


@router.get("")
def get_command_center(
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    today = today_iso()
    if ensure_recent_meeting_action_drafts(db):
        db.commit()
    projects = db.query(BrseTodoProjectRecord).order_by(BrseTodoProjectRecord.updated_at.desc()).all()
    project_map = {project.id: project for project in projects}
    active_projects = [project for project in projects if not project.archived_at]
    active_project = active_projects[0] if active_projects else (projects[0] if projects else None)

    todo_query = db.query(BrseTodoItemRecord)
    if active_project:
        todo_query = todo_query.filter(BrseTodoItemRecord.project_id == active_project.id)
    todo_items = todo_query.all()
    open_todos = [item for item in todo_items if not item.done]
    done_today = [
        item for item in todo_items
        if item.done and ((item.updated_at_client or "").startswith(today) or (item.updated_at and item.updated_at.date().isoformat() == today))
    ]
    deadline_risk = [item for item in open_todos if item.deadline and item.deadline <= today]
    next_focus = sorted(
        open_todos,
        key=lambda item: (
            {"P0": 0, "P1": 1, "P2": 2}.get(item.priority or "P1", 1),
            item.deadline or "9999-12-31",
            item.phase,
            item.title,
        ),
    )[:8]

    operations = db.query(OperationRecord).order_by(OperationRecord.updated_at.desc()).all()
    closed_statuses = {"Closed", "Done", "Resolved", "Answered", "Approved", "Rejected", "Implemented"}
    waiting_qna = [
        record for record in operations
        if record.type == "qna" and record.status in {"Open", "Sent", "Waiting Customer"}
    ]
    qna_due = [record for record in waiting_qna if not record.due_date or record.due_date <= today]
    pending_cr = [
        record for record in operations
        if record.type == "cr" and record.status not in {"Approved", "Rejected", "Implemented", "Closed"}
    ]
    overdue_operations = [
        record for record in operations
        if record.due_date and record.due_date < today and record.status not in closed_statuses
    ]
    high_power_tool_risks = power_tools_open_high_risks(db, active_project.id if active_project else None)

    schedules = (
        db.query(PersonalScheduleRecord)
        .filter(PersonalScheduleRecord.date >= today)
        .order_by(PersonalScheduleRecord.date.asc(), PersonalScheduleRecord.start_time.asc())
        .limit(8)
        .all()
    )

    pending_meeting_drafts = (
        db.query(MeetingTodoDraftRecord)
        .filter(MeetingTodoDraftRecord.review_status == "pending")
        .order_by(MeetingTodoDraftRecord.created_at.desc())
        .limit(8)
        .all()
    )
    unsynced_meeting_actions = [serialize_meeting_todo_draft(draft) for draft in pending_meeting_drafts]

    actions: list[dict[str, Any]] = []
    if deadline_risk or overdue_operations:
        actions.append(action_payload(
            "open_overdue",
            f"{len(deadline_risk) + len(overdue_operations)} overdue/deadline item cần xử lý",
            "Mở nhóm việc quá hạn, chốt owner/deadline hoặc gửi nhắc khách ngay trong Operations.",
            "/app?focus=overdue",
            0,
            {"todo_count": len(deadline_risk), "operation_count": len(overdue_operations)},
        ))
    if qna_due:
        actions.append(action_payload(
            "copy_qna_reminder",
            f"{len(qna_due)} Q&A nên nhắc khách hôm nay",
            "Copy Horenso reminder draft hoặc mở Operations để xử lý từng Q&A.",
            "/app/operations?type=qna",
            1,
            {"records": [operation_payload(record) for record in qna_due[:5]]},
        ))
    if unsynced_meeting_actions:
        actions.append(action_payload(
            "sync_meeting_actions",
            f"{len(unsynced_meeting_actions)} Meeting action đang chờ duyệt",
            "Review/approve action item từ Meeting Note trước khi tạo BrSE Todo.",
            "/app/meeting-note",
            2,
            {"actions": unsynced_meeting_actions[:5]},
        ))
    if pending_cr:
        actions.append(action_payload(
            "review_cr",
            f"{len(pending_cr)} CR pending cần impact/approval",
            "Ưu tiên xác nhận scope, estimate và ảnh hưởng release trước daily report.",
            "/app/operations?type=cr",
            3,
            {"records": [operation_payload(record) for record in pending_cr[:5]]},
        ))
    if high_power_tool_risks:
        actions.append(action_payload(
            "review_power_tool_risks",
            f"{len(high_power_tool_risks)} high risk từ Power Tools cần xử lý",
            "Đẩy risk sang Operations hoặc chốt mitigation để đưa vào report ngày/tuần.",
            "/app/power-tools",
            4,
            {"risks": high_power_tool_risks[:5]},
        ))
    actions.append(action_payload(
        "copy_daily_summary",
        "Copy Daily Focus summary",
        "Tổng hợp nhanh Todo, Q&A, CR, meeting action và lịch gần nhất.",
        "/app/reports",
        9,
    ))

    return {
        "generated_at": datetime.now(UTC).isoformat(),
        "today": today,
        "active_project": {
            "id": active_project.id,
            "name": active_project.name,
            "preset": active_project.preset,
            "active_phase": active_project.active_phase,
        } if active_project else None,
        "metrics": {
            "todo_total": len(todo_items),
            "todo_done": len([item for item in todo_items if item.done]),
            "done_today": len(done_today),
            "deadline_risk": len(deadline_risk),
            "waiting_qna": len(waiting_qna),
            "qna_due": len(qna_due),
            "pending_cr": len(pending_cr),
            "power_tool_high_risks": len(high_power_tool_risks),
            "overdue_operations": len(overdue_operations),
            "unsynced_meeting_actions": len(unsynced_meeting_actions),
            "upcoming_schedules": len(schedules),
        },
        "actions": sorted(actions, key=lambda item: item["severity"]),
        "next_focus": [todo_item_payload(item, project_map.get(item.project_id)) for item in next_focus],
        "deadline_risk": [todo_item_payload(item, project_map.get(item.project_id)) for item in deadline_risk[:8]],
        "waiting_qna": [operation_payload(record) for record in waiting_qna[:8]],
        "pending_cr": [operation_payload(record) for record in pending_cr[:8]],
        "power_tool_high_risks": high_power_tool_risks,
        "overdue_operations": [operation_payload(record) for record in overdue_operations[:8]],
        "unsynced_meeting_actions": unsynced_meeting_actions,
        "upcoming_schedules": [
            {
                "id": schedule.id,
                "date": schedule.date,
                "title": schedule.title,
                "start_time": schedule.start_time or "",
                "end_time": schedule.end_time or "",
                "timezone": schedule.timezone or "Asia/Tokyo",
            }
            for schedule in schedules
        ],
    }


@router.post("/sync-meeting-actions")
def sync_meeting_actions_to_todo(db: Session = Depends(get_db)) -> dict[str, Any]:
    created, project = sync_recent_completed_meeting_actions_to_todo(db)
    db.commit()
    return {"created": created, "project_id": project.id, "project_name": project.name}


@router.get("/meeting-action-drafts")
def list_meeting_action_drafts(db: Session = Depends(get_db)) -> dict[str, Any]:
    if ensure_recent_meeting_action_drafts(db):
        db.commit()
    drafts = (
        db.query(MeetingTodoDraftRecord)
        .filter(MeetingTodoDraftRecord.review_status == "pending")
        .order_by(MeetingTodoDraftRecord.created_at.desc())
        .limit(50)
        .all()
    )
    return {"drafts": [serialize_meeting_todo_draft(draft) for draft in drafts]}


@router.post("/meeting-action-drafts/{draft_id}/approve")
def approve_meeting_action_draft(draft_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    draft = db.query(MeetingTodoDraftRecord).filter(MeetingTodoDraftRecord.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Meeting Todo draft not found.")
    if draft.review_status == "rejected":
        raise HTTPException(status_code=409, detail="Rejected Meeting Todo draft cannot be approved.")
    item = approve_meeting_todo_draft(db, draft)
    db.commit()
    return {
        "draft": serialize_meeting_todo_draft(draft),
        "todo_item_id": item.id,
        "project_id": item.project_id,
    }


@router.post("/meeting-action-drafts/{draft_id}/reject")
def reject_meeting_action_draft(draft_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    draft = db.query(MeetingTodoDraftRecord).filter(MeetingTodoDraftRecord.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Meeting Todo draft not found.")
    if draft.review_status == "approved":
        raise HTTPException(status_code=409, detail="Approved Meeting Todo draft cannot be rejected.")
    draft.review_status = "rejected"
    db.commit()
    return {"draft": serialize_meeting_todo_draft(draft)}
