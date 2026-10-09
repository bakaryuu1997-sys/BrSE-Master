from fastapi import APIRouter

from app.api.routes import (
    ai,
    ai_ocr,
    calendar,
    client_state, 
    command_center, 
    email_history, 
    email_templates, 
    health, 
    knowledge, 
    meeting_minutes, 
    meetings_upload, 
    meetings_process, 
    meetings_content, 
    memos, 
    note_index, 
    operations, 
    power_tools, 
    projects, 
    reports, 
    stt,
    todos, 
    universal_notes,
    glossary,
    settings
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(glossary.router, prefix="/glossary", tags=["glossary"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])

# Sensitive routers are now protected automatically via global auth middleware in main.py
api_router.include_router(meetings_upload.router, prefix="/meetings", tags=["meetings"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(meetings_process.router, prefix="/meetings", tags=["meetings"])
api_router.include_router(meetings_content.router, prefix="/meetings", tags=["meetings"])
api_router.include_router(email_templates.router, prefix="/email-templates", tags=["email-templates"])
api_router.include_router(email_history.router, prefix="/email-history", tags=["email-history"])
api_router.include_router(memos.router, prefix="/memos", tags=["memos"])
api_router.include_router(todos.router, prefix="/todos", tags=["todos"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(ai_ocr.router, prefix="/ai", tags=["ai"])
api_router.include_router(stt.router, prefix="/stt", tags=["stt"])
api_router.include_router(knowledge.router, prefix="/knowledge", tags=["knowledge"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(client_state.router, prefix="/client-state", tags=["client-state"])
api_router.include_router(meeting_minutes.router, prefix="/meeting-minutes", tags=["meeting-minutes"])
api_router.include_router(calendar.router, prefix="/calendar", tags=["calendar"])
api_router.include_router(operations.router, prefix="/operations", tags=["operations"])
api_router.include_router(power_tools.router, prefix="/power-tools", tags=["power-tools"])
api_router.include_router(command_center.router, prefix="/command-center", tags=["command-center"])
api_router.include_router(note_index.router, prefix="/note-index", tags=["note-index"])
api_router.include_router(universal_notes.router, prefix="/universal-notes", tags=["universal-notes"])


