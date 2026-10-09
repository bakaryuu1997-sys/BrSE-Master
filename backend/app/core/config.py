from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    database_url: str = "sqlite:///./brse.db"
    jwt_secret: str = "change-me-access-secret"
    jwt_refresh_secret: str = "change-me-refresh-secret"
    app_origin: str = "http://localhost:3010"
    brse_api_secret: str = ""
    pdf_font_path: str = "/app/fonts/NotoSansJP-Regular.otf"

    # AI via 9Router proxy
    openai_base_url: str = "http://localhost:20128/v1"
    openai_api_key: str = "9router-key"
    ai_model: str = "openrouter/nvidia/nemotron-3-super-120b-a12b:free"
    ocr_vision_model: str = "gemini/gemini-3.1-flash-lite-preview"
    # Local-default OCR: when no Gemini key is configured, OCR falls back to this
    # local Ollama vision model so screenshot OCR works fully offline instead of
    # depending on the (sometimes unreachable) 9router -> Google Gemini lane.
    ocr_local_vision_model: str = "qwen3.5:9b"
    gemini_api_key: str = ""
    ollama_base_url: str = "http://localhost:11434"

    # --- Meeting Note AI Config ---
    # Keep Meeting Note on the same local 9Router lane as the BrSE AI helpers.
    nine_router_base_url: str = "http://localhost:20128/v1"
    nine_router_api_key: str = "9router-key"
    ai_model_primary: str = "openrouter/nvidia/nemotron-3-super-120b-a12b:free"

    # Speech-to-text engine. "local" = faster-whisper (CTranslate2; the safe
    # default for VN/JP/EN). "cloud" = OpenAI-compatible /audio/transcriptions
    # (experimental — the provider behind openai_base_url must support audio).
    # Future engines (whisperx, funasr) plug in here behind the same flag.
    stt_engine: str = "local"

    # WhisperX + real speaker diarization (Phase 3 — opt-in, GPU recommended).
    # Unused until stt_engine="whisperx"; see
    # docs/reviews/STT-PHASE3-WHISPERX-PLAN.md for install + enablement.
    whisperx_model: str = "large-v2"
    whisperx_device: str = "cuda"
    whisperx_compute_type: str = "float16"
    stt_diarization: bool = False
    # Required for pyannote diarization (a gated HuggingFace model). Empty = off.
    huggingface_token: str = ""

    # Note consolidation (contract §5): which store serves each note surface.
    # "legacy" = original table (default, unchanged). "universal" = UniversalNote.
    # Writes stay dual (legacy + projection/backup) for instant rollback.
    memo_canonical_read: str = "legacy"
    minutes_canonical_read: str = "legacy"

    # Whisper Transcription
    whisper_model: str = "small"
    # Cloud STT model id sent to the 9Router/OpenAI-compatible transcriptions
    # endpoint. The 9Router proxy may not expose "whisper-1", so keep it
    # overridable via env without touching code.
    cloud_stt_model: str = "whisper-1"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"
    whisper_language: str = "auto"
    whisper_beam_size: int = 5
    whisper_best_of: int = 5
    whisper_initial_prompt: str = "BrSE technical meeting. Terms: design note, meeting note, import, export, dev, developer, clarify, requirement, business rule, API, UI, UX, backlog, sprint, release, UAT, QA, bug, ticket, GitHub, Docker, database, frontend, backend. Vietnamese Japanese English mixed speech."
    whisper_hotwords: str = "design note meeting note import export dev developer clarify requirement business rule API UI UX backlog sprint release UAT QA bug ticket GitHub Docker database frontend backend"
    whisper_vad_filter: bool = True
    whisper_cpu_threads: int = 4
    whisper_num_workers: int = 1
    # Memory guard: before loading a local model, check free RAM and fall back to
    # a lighter model when there is not enough headroom (avoids OOM that can crash
    # the container/OS on 16GB machines running many apps). Needs psutil; if psutil
    # is unavailable the guard is a no-op and loading proceeds unchanged.
    whisper_memory_guard: bool = True
    whisper_fallback_model: str = "small"
    # Extra RAM (GB) kept free for the rest of the process and OS.
    whisper_memory_headroom_gb: float = 1.5
    meeting_processing_workers: int = 2
    meeting_summary_chunk_workers: int = 2
    whisper_parallel_chunks: bool = True
    whisper_parallel_chunk_seconds: int = 900
    whisper_parallel_chunk_workers: int = 2
    whisper_parallel_min_seconds: int = 1800
    max_meeting_upload_mb: int = 2048

    # Storage
    upload_folder: str = "uploads"
    memo_folder: str = "memos"
    transcript_folder: str = "transcripts"
    base_dir: str = "."

    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")


settings = Settings()
