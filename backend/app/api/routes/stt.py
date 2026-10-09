from fastapi import APIRouter

from app.core.config import settings

router = APIRouter()


@router.get("/status")
def get_stt_status() -> dict[str, object]:
    return {
        "status": "ok",
        "provider": "local-whisper",
        "model": settings.whisper_model,
        "device": settings.whisper_device,
        "compute_type": settings.whisper_compute_type,
        "language": settings.whisper_language,
        "ready": True,
    }
