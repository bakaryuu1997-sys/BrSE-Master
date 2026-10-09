# STT Phase 3 — WhisperX + real speaker diarization (plan)

**Status:** ready to implement **on a GPU machine**. The config seam landed
(`settings.whisperx_*`, `stt_diarization`, `huggingface_token`); the adapter body
below must be implemented and verified where a GPU + deps + HF token exist. It is
intentionally **not** wired into the live CPU path yet (this sandbox has no GPU,
no torch/whisperx/pyannote, and no HF token, so it cannot be verified here).

Goal: an opt-in `stt_engine="whisperx"` that gives accurate word-level
timestamps (alignment) and **real** speaker labels (pyannote), replacing the
keyword-based `_infer_role_hint` guesswork — while faster-whisper stays the
default for VN/JP/EN.

## 1. Dependencies (do NOT add to the slim CPU image's requirements.txt)
Create `backend/requirements-gpu.txt` (installed only on the GPU host/image):
```
torch              # CUDA build matching your driver (see pytorch.org)
whisperx>=3.1
pyannote.audio>=3.1
```
Keep `backend/requirements.txt` unchanged so the default `python:3.12-slim`
Docker build stays light and CPU-only.

## 2. GPU runtime
Two options:
- **A (recommended):** run the backend **natively** on the GPU host (outside the
  slim container) with `requirements-gpu.txt`, pointing at the same Postgres.
- **B:** a CUDA Docker image + GPU passthrough in `docker-compose.yml`:
  ```yaml
  backend:
    deploy:
      resources:
        reservations:
          devices: [{ capabilities: ["gpu"] }]
  ```
  and a `Dockerfile.gpu` based on an `nvidia/cuda` Python image.

## 3. HuggingFace token (diarization is gated)
1. Accept the license for `pyannote/speaker-diarization-3.1` (and its deps) on
   huggingface.co while logged in.
2. Put the token in `.env`: `HUGGINGFACE_TOKEN=hf_xxx`. Leaving it empty keeps
   diarization off even when `stt_engine="whisperx"`.

## 4. Adapter (new file `backend/app/services/stt_whisperx.py`)
Lazy-import the heavy deps so importing this module never breaks the CPU path.
Return the **same segment dict shape** the pipeline already consumes
(`start`/`end`/`text`/`confidence`) plus an optional `speaker`.

```python
def transcribe_whisperx(file_path: str, language: str | None = None):
    import whisperx  # lazy; raises if not installed on this host
    from app.core.config import settings

    device = settings.whisperx_device
    model = whisperx.load_model(
        settings.whisperx_model, device, compute_type=settings.whisperx_compute_type
    )
    audio = whisperx.load_audio(file_path)
    result = model.transcribe(audio, language=language)

    # Word-level alignment
    align_model, meta = whisperx.load_align_model(result["language"], device)
    result = whisperx.align(result["segments"], align_model, meta, audio, device)

    # Optional real diarization
    if settings.stt_diarization and settings.huggingface_token:
        diarize = whisperx.DiarizationPipeline(
            use_auth_token=settings.huggingface_token, device=device
        )
        result = whisperx.assign_word_speakers(diarize(audio), result)

    segments = [
        {
            "start": round(float(s.get("start") or 0), 2),
            "end": round(float(s.get("end") or 0), 2),
            "text": (s.get("text") or "").strip(),
            "speaker": s.get("speaker"),
            "confidence": float(s.get("score") or 0) if s.get("score") else None,
        }
        for s in result["segments"]
    ]
    full_text = " ".join(s["text"] for s in segments).strip()
    return full_text, result.get("language", language or "auto"), segments
```

## 5. Wiring (one dispatch point, fallback to local)
In `meeting_processor._process_meeting_task_locked`, where the transcriber is
built, branch on the engine and **fall back to local on any error** so a broken
GPU run never loses the job:
```python
if settings.stt_engine == "whisperx":
    try:
        from app.services.stt_whisperx import transcribe_whisperx
        transcript, lang, segments = transcribe_whisperx(transcription_input)
    except Exception as exc:
        logger.warning("WhisperX failed (%s); falling back to local Whisper.", exc)
        transcript, lang, segments = TranscriptionService(
            mode="local", model_name=whisper_model
        ).transcribe(transcription_input, language=None, job_id=job_id)
else:
    # existing local/cloud path (unchanged)
```
Real speakers then flow through automatically: `speaker_count` =
`len({s["speaker"] for s in segments if s.get("speaker")})`, and the summarizer
can prefer the real `speaker` over `_infer_role_hint`.

## 6. Verification (on the GPU box — required before calling this done)
1. Install `requirements-gpu.txt`; set `HUGGINGFACE_TOKEN`, `STT_ENGINE=whisperx`,
   `STT_DIARIZATION=true`.
2. Run a short bilingual (VN/JP/EN) clip through Meeting Note.
3. Confirm: segments carry `speaker` labels and tighter word timestamps;
   `realtime_factor` in the benchmark; no crash; and that **unsetting the token
   or forcing an error falls back to local** (job still completes).
4. Compare quality/speed vs local on the same clip; record in the status-meta
   benchmark.

## 7. Phasing & rollback
- **3a:** WhisperX transcription + alignment only (`stt_diarization=false`).
- **3b:** enable pyannote diarization once 3a is stable.
- **Rollback:** set `stt_engine=local` (instant; no schema/data change).

## 8. FunASR / SenseVoice (separate, later)
Same adapter seam (`stt_engine="funasr"`, `app/services/stt_funasr.py`, lazy
import). Offer as an experimental JP/EN engine only — **not** a VN default, given
weak Vietnamese support. Keep faster-whisper the default.
