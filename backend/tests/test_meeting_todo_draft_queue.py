from datetime import UTC, datetime

from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.main import app
from app.models.meeting import MeetingRecord
from app.models.todo import BrseTodoItemRecord, MeetingTodoDraftRecord
from app.services.meeting_todo_sync import create_meeting_action_drafts


client = TestClient(app)


def cleanup(prefix: str) -> None:
    db = SessionLocal()
    try:
        db.query(BrseTodoItemRecord).filter(BrseTodoItemRecord.meeting_id.like(f"{prefix}%")).delete(synchronize_session=False)
        db.query(MeetingTodoDraftRecord).filter(MeetingTodoDraftRecord.meeting_id.like(f"{prefix}%")).delete(synchronize_session=False)
        db.query(MeetingRecord).filter(MeetingRecord.id.like(f"{prefix}%")).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


def test_meeting_action_draft_queue_dedupes_and_requires_review() -> None:
    prefix = "draft-queue-pytest"
    meeting_id = f"{prefix}-1"
    cleanup(prefix)

    db = SessionLocal()
    try:
        meeting = MeetingRecord(
            id=meeting_id,
            title="Draft Queue Meeting",
            status="completed",
            completed_at=datetime.now(UTC),
        )
        db.add(meeting)
        db.commit()

        analysis = {
            "actions": [
                {
                    "task": "Confirm UAT evidence package before customer review",
                    "owner": "BrSE",
                    "deadline": "2026-05-30",
                    "status": "Open",
                    "quote": "Customer asked for evidence before review.",
                }
            ]
        }

        assert create_meeting_action_drafts(db, meeting, analysis) == 1
        assert create_meeting_action_drafts(db, meeting, analysis) == 0
        db.commit()

        draft = db.query(MeetingTodoDraftRecord).filter(MeetingTodoDraftRecord.meeting_id == meeting_id).one()
        assert draft.review_status == "pending"
        assert draft.evidence_url == f"meeting:{meeting_id}"
        assert draft.source_quote == "Customer asked for evidence before review."

        history_response = client.get("/api/meetings/history")
        assert history_response.status_code == 200
        history_item = next(item for item in history_response.json() if item["id"] == meeting_id)
        assert history_item["meeting_action_pending_count"] == 1
        assert history_item["meeting_action_synced_count"] == 0
        assert history_item["meeting_actions_synced"] is False

        response = client.post(f"/api/command-center/meeting-action-drafts/{draft.id}/approve")
        assert response.status_code == 200
        payload = response.json()
        assert payload["todo_item_id"] == draft.id

        db.expire_all()
        item = db.query(BrseTodoItemRecord).filter(BrseTodoItemRecord.meeting_id == meeting_id).one()
        refreshed_draft = db.query(MeetingTodoDraftRecord).filter(MeetingTodoDraftRecord.id == draft.id).one()
        assert item.title == "Confirm UAT evidence package before customer review"
        assert item.evidence_url == f"meeting:{meeting_id}"
        assert refreshed_draft.review_status == "approved"

        history_response = client.get("/api/meetings/history")
        assert history_response.status_code == 200
        history_item = next(item for item in history_response.json() if item["id"] == meeting_id)
        assert history_item["meeting_action_pending_count"] == 0
        assert history_item["meeting_action_synced_count"] == 1
        assert history_item["meeting_actions_synced"] is True
    finally:
        db.close()
        cleanup(prefix)


def test_meeting_action_draft_can_be_rejected() -> None:
    prefix = "draft-queue-reject"
    meeting_id = f"{prefix}-1"
    cleanup(prefix)

    db = SessionLocal()
    try:
        meeting = MeetingRecord(id=meeting_id, title="Reject Draft Meeting", status="completed", completed_at=datetime.now(UTC))
        db.add(meeting)
        db.commit()
        create_meeting_action_drafts(
            db,
            meeting,
            {"actions": [{"task": "Review rejected follow-up candidate from meeting", "owner": "PM"}]},
        )
        db.commit()
        draft = db.query(MeetingTodoDraftRecord).filter(MeetingTodoDraftRecord.meeting_id == meeting_id).one()

        response = client.post(f"/api/command-center/meeting-action-drafts/{draft.id}/reject")
        assert response.status_code == 200

        db.expire_all()
        refreshed_draft = db.query(MeetingTodoDraftRecord).filter(MeetingTodoDraftRecord.id == draft.id).one()
        assert refreshed_draft.review_status == "rejected"
        assert db.query(BrseTodoItemRecord).filter(BrseTodoItemRecord.meeting_id == meeting_id).count() == 0
    finally:
        db.close()
        cleanup(prefix)
