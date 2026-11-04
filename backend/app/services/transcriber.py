import json
import os
import shutil
import tempfile
import time
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from faster_whisper import WhisperModel
from openai import OpenAI
from app.core.config import settings
from app.services.stt_metrics import effective_chunk_workers, segment_confidence

try:
    import ffmpeg
except ModuleNotFoundError:
    ffmpeg = None

logger = logging.getLogger(__name__)

# OpenAI's audio transcription endpoint rejects uploads larger than 25 MB.
# 9Router proxies the same contract, so guard before sending to fail with a
# clear message instead of an opaque API error.
OPENAI_AUDIO_MAX_BYTES = 25 * 1024 * 1024

# Approximate peak resident RAM (GB) for faster-whisper int8 on CPU, including
# decode buffers. Used by the memory guard to avoid OOM-loading a model that does
# not fit in the currently free RAM. Values are deliberately conservative.
_MODEL_RAM_GB = {
    "tiny": 1.0,
    "base": 1.0,
    "small": 2.0,
    "medium": 3.5,
    "large": 6.0,
    "large-v1": 6.0,
    "large-v2": 6.0,
    "large-v3": 6.0,
    "large-v3-turbo": 4.5,
    "turbo": 4.5,
}


def _available_ram_gb():
    """Return free system RAM in GB, or None when psutil is unavailable."""
    try:
        import psutil
    except ImportError:
        return None
    try:
        return psutil.virtual_memory().available / (1024 ** 3)
    except Exception:  # pragma: no cover - psutil platform edge cases
        return None


def _required_ram_gb(model_name):
    """Best-effort estimate of RAM needed for a Whisper model id."""
    key = (model_name or "").lower()
    if key in _MODEL_RAM_GB:
        return _MODEL_RAM_GB[key]
    # Model ids may be paths like "Systran/faster-whisper-large-v3"; match by tier.
    if "large" in key:
        return 4.5 if "turbo" in key else 6.0
    if "medium" in key:
        return 3.5
    if "small" in key:
        return 2.0
    if "base" in key or "tiny" in key:
        return 1.0
    return 1.5


def guard_whisper_model(requested, fallback="small", headroom_gb=1.5):
    """Downgrade to a lighter model when free RAM is too low to load `requested`.

    Returns the model id to actually load. When psutil is unavailable, the guard
    cannot measure RAM and returns `requested` unchanged (no-op). Only downgrades
    when the lighter `fallback` actually fits in the available RAM.
    """
    if not getattr(settings, "whisper_memory_guard", True):
        return requested
    available = _available_ram_gb()
    if available is None:
        return requested  # Cannot measure RAM -> proceed without changing behavior.

    required = _required_ram_gb(requested)
    if available >= required + headroom_gb:
        return requested  # Enough headroom.

    fallback_required = _required_ram_gb(fallback)
    if fallback != requested and available >= fallback_required + headroom_gb:
        logger.warning(
            "🧠 Whisper memory guard: %.1fGB free < %.1fGB needed for '%s'; "
            "falling back to lighter model '%s'.",
            available, required + headroom_gb, requested, fallback,
        )
        return fallback

    logger.warning(
        "🧠 Whisper memory guard: low RAM (%.1fGB free) for '%s' and no lighter "
        "fallback fits — proceeding with caution (OOM risk).",
        available, requested,
    )
    return requested


def _segment_value(segment, key, default=None):
    """Read a field from an STT segment that may be an object or a dict.

    The OpenAI Python SDK returns verbose_json segments as objects with
    attributes (s.start/s.end/s.text), while some proxies / cached payloads
    hand back plain dicts. Support both shapes.
    """
    if isinstance(segment, dict):
        return segment.get(key, default)
    return getattr(segment, key, default)


class TranscriptionService:
    _model_instance = None  # Singleton instance for WhisperModel
    _model_name = None      # Keep track of which model is currently loaded

    def __init__(self, mode="local", model_name=None):
        self.mode = mode
        selected_model = model_name or settings.whisper_model

        if self.mode == "local":
            selected_model = guard_whisper_model(
                selected_model,
                fallback=settings.whisper_fallback_model,
                headroom_gb=settings.whisper_memory_headroom_gb,
            )
            if TranscriptionService._model_instance is None or TranscriptionService._model_name != selected_model:
                if TranscriptionService._model_instance is not None:
                    logger.info(f"🔄 Releasing previous Whisper model ({TranscriptionService._model_name}) to free memory...")
                    TranscriptionService._model_instance = None
                    import gc
                    gc.collect()
                
                logger.info(f"🔄 Initializing LOCAL Whisper Model ({selected_model}) on {settings.whisper_device}...")
                TranscriptionService._model_instance = WhisperModel(
                    selected_model, 
                    device=settings.whisper_device, 
                    compute_type=settings.whisper_compute_type,
                    cpu_threads=settings.whisper_cpu_threads,
                    num_workers=settings.whisper_num_workers,
                )
                TranscriptionService._model_name = selected_model
                logger.info(f"✅ LOCAL Whisper Model ({selected_model}) is ready!")
            self.model = TranscriptionService._model_instance
        else:
            logger.info("☁️ CLOUD STT activated (Model via 9Router)")
            self.client = OpenAI(
                base_url=settings.openai_base_url or settings.nine_router_base_url,
                api_key=settings.openai_api_key or settings.nine_router_api_key
            )

    def transcribe(self, file_path, language=None, progress_callback=None, job_id=None):
        """
        Transcribe audio/video file to text with timestamps.
        Returns: full_text, detected_lang, segments_data
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        logger.info(f"🎙️ Starting transcribe ({self.mode}): {os.path.basename(file_path)}")
        start_time = time.time()
        segments_data = []

        if self.mode == "local":
            if self._should_parallel_transcribe(file_path):
                try:
                    return self._transcribe_parallel_chunks(file_path, language, progress_callback, job_id=job_id)
                except Exception as exc:
                    logger.warning(f"⚠️ Parallel chunk transcription failed, falling back to single pass: {exc}")
            transcribe_language = None if not language or language == "auto" else language
            result, detected_lang, segments_data = self._transcribe_single_file(
                file_path,
                transcribe_language,
                progress_callback=progress_callback,
            )
        else:
            # Cloud STT via 9Router (OpenAI-compatible)
            file_size = os.path.getsize(file_path)
            if file_size > OPENAI_AUDIO_MAX_BYTES:
                raise ValueError(
                    f"Cloud STT upload is {file_size / (1024 * 1024):.1f} MB, "
                    f"over the {OPENAI_AUDIO_MAX_BYTES // (1024 * 1024)} MB limit. "
                    "Use local Whisper or split the audio first."
                )
            cloud_model = settings.cloud_stt_model
            with open(file_path, "rb") as audio_file:
                response = self.client.audio.transcriptions.create(
                    model=cloud_model,  # Configurable; 9Router may not expose "whisper-1"
                    file=audio_file,
                    language=language,
                    response_format="verbose_json"
                )
                result = response.text
                detected_lang = language or "auto"
                # Parse segments from verbose_json. The SDK returns segment
                # objects (s.start/s.end/s.text); accept dicts too.
                for s in getattr(response, "segments", None) or []:
                    start = _segment_value(s, "start", 0) or 0
                    end = _segment_value(s, "end", 0) or 0
                    text = _segment_value(s, "text", "") or ""
                    segments_data.append({
                        "start": round(float(start), 2),
                        "end": round(float(end), 2),
                        "text": str(text).strip()
                    })

        duration = time.time() - start_time
        logger.info(f"✅ Transcribe finished in {duration:.2f}s")
        return result, detected_lang, segments_data

    def _transcribe_kwargs(self, language=None):
        transcribe_kwargs = {
            "beam_size": settings.whisper_beam_size,
            "best_of": settings.whisper_best_of,
            "language": language,
            "condition_on_previous_text": False,
            "language_detection_segments": 4,
        }
        initial_prompt = (settings.whisper_initial_prompt or "").strip()
        hotwords = (settings.whisper_hotwords or "").strip()
        if initial_prompt:
            transcribe_kwargs["initial_prompt"] = initial_prompt
        if hotwords:
            transcribe_kwargs["hotwords"] = hotwords
        if settings.whisper_vad_filter:
            transcribe_kwargs["vad_filter"] = True
            transcribe_kwargs["vad_parameters"] = {"min_silence_duration_ms": 500}
        return transcribe_kwargs

    @staticmethod
    def decode_audio_with_ffmpeg(file_path, sampling_rate=16000):
        """Decode any media file to a mono float32 array using the ffmpeg CLI.

        faster-whisper's own decoder calls av.open(..., metadata_errors=...), which newer PyAV
        releases reject ("open() got an unexpected keyword argument 'metadata_errors'"). Decoding
        here keeps transcription independent of that PyAV/faster-whisper version coupling.
        Returns None when ffmpeg is unavailable or fails so the caller can fall back.
        """
        import subprocess

        import numpy as np

        if shutil.which("ffmpeg") is None:
            return None
        cmd = [
            "ffmpeg", "-nostdin", "-v", "error", "-i", str(file_path),
            "-vn", "-ac", "1", "-ar", str(sampling_rate), "-f", "s16le", "-",
        ]
        try:
            proc = subprocess.run(cmd, capture_output=True, check=True)
        except (OSError, subprocess.CalledProcessError) as exc:
            logger.warning("ffmpeg audio decode failed, falling back to faster-whisper decoder: %s", exc)
            return None
        if not proc.stdout:
            return None
        return np.frombuffer(proc.stdout, dtype=np.int16).astype(np.float32) / 32768.0

    def _transcribe_single_file(self, file_path, language=None, progress_callback=None, time_offset=0.0):
        audio = self.decode_audio_with_ffmpeg(file_path)
        segments, info = self.model.transcribe(
            audio if audio is not None else file_path, **self._transcribe_kwargs(language)
        )
        segments_data = []
        full_text_list = []
        for segment in segments:
            full_text_list.append(segment.text)
            avg_logprob = getattr(segment, "avg_logprob", None)
            segments_data.append({
                "start": round(float(segment.start or 0) + time_offset, 2),
                "end": round(float(segment.end or 0) + time_offset, 2),
                "text": segment.text.strip(),
                "avg_logprob": round(float(avg_logprob), 3) if avg_logprob is not None else None,
                "no_speech_prob": round(float(getattr(segment, "no_speech_prob", 0.0) or 0.0), 3),
                "confidence": segment_confidence(avg_logprob),
            })
            if progress_callback and len(segments_data) % 10 == 0:
                duration = getattr(info, "duration", None) or 0
                progress_callback(len(segments_data), float(segment.end or 0) + time_offset, float(duration or 0) + time_offset)
        return " ".join(full_text_list).strip(), info.language, segments_data

    def _probe_duration(self, file_path):
        if ffmpeg is None:
            return 0.0
        try:
            probe = ffmpeg.probe(file_path)
            return float(probe.get("format", {}).get("duration") or 0)
        except Exception:
            return 0.0

    def _should_parallel_transcribe(self, file_path):
        if self.mode != "local" or not settings.whisper_parallel_chunks:
            return False
        if ffmpeg is None or not shutil.which("ffmpeg"):
            return False
        duration = self._probe_duration(file_path)
        return duration >= max(60, settings.whisper_parallel_min_seconds)

    def _split_audio_chunks(self, file_path, chunk_dir, chunk_seconds):
        pattern = os.path.join(chunk_dir, "chunk_%04d.wav")
        (
            ffmpeg
            .input(file_path)
            .output(
                pattern,
                f="segment",
                segment_time=chunk_seconds,
                reset_timestamps=1,
                ac=1,
                ar=16000,
                vn=None,
                loglevel="error",
            )
            .overwrite_output()
            .run(quiet=True)
        )
        chunks = sorted(
            os.path.join(chunk_dir, name)
            for name in os.listdir(chunk_dir)
            if name.startswith("chunk_") and name.endswith(".wav")
        )
        return [(index, path, index * chunk_seconds) for index, path in enumerate(chunks)]

    def _transcribe_parallel_chunks(self, file_path, language=None, progress_callback=None, job_id=None):
        transcribe_language = None if not language or language == "auto" else language
        chunk_seconds = max(300, int(settings.whisper_parallel_chunk_seconds))
        with tempfile.TemporaryDirectory(prefix="brse-whisper-chunks-") as chunk_dir:
            chunks = self._split_audio_chunks(file_path, chunk_dir, chunk_seconds)
            if len(chunks) <= 1:
                return self._transcribe_single_file(file_path, transcribe_language, progress_callback=progress_callback)

            # Clamp workers so workers x cpu_threads stays within available cores
            # (avoids CPU oversubscription on long videos); never exceeds chunks.
            max_workers = effective_chunk_workers(
                settings.whisper_parallel_chunk_workers,
                os.cpu_count(),
                len(chunks),
                settings.whisper_cpu_threads,
            )
            logger.info(f"⚡ Parallel Whisper: {len(chunks)} chunks, {max_workers} workers")
            completed_chunks = 0
            detected_lang = transcribe_language or "auto"
            results = {}
            cache_dir = None
            if job_id:
                cache_dir = os.path.join(settings.transcript_folder, "_chunks", str(job_id))
                os.makedirs(cache_dir, exist_ok=True)
                for index, _chunk_path, _offset in chunks:
                    cache_path = os.path.join(cache_dir, f"chunk_{index:04d}.json")
                    if not os.path.exists(cache_path):
                        continue
                    try:
                        with open(cache_path, "r", encoding="utf-8") as handle:
                            payload = json.load(handle)
                        text = str(payload.get("text") or "")
                        lang = str(payload.get("lang") or detected_lang)
                        segments = payload.get("segments") if isinstance(payload.get("segments"), list) else []
                        results[index] = (text, lang, segments)
                        completed_chunks += 1
                        if lang and lang != "auto":
                            detected_lang = lang
                    except (OSError, json.JSONDecodeError):
                        continue

            def run_chunk(chunk):
                index, chunk_path, offset = chunk
                text, lang, segments = self._transcribe_single_file(chunk_path, transcribe_language, time_offset=offset)
                return index, text, lang, segments

            pending_chunks = [chunk for chunk in chunks if chunk[0] not in results]
            if results:
                logger.info(f"↩️ Resuming Whisper from {len(results)}/{len(chunks)} cached chunks")
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                future_map = {executor.submit(run_chunk, chunk): chunk for chunk in pending_chunks}
                for future in as_completed(future_map):
                    index, text, lang, segments = future.result()
                    results[index] = (text, lang, segments)
                    if cache_dir:
                        cache_path = os.path.join(cache_dir, f"chunk_{index:04d}.json")
                        with open(cache_path, "w", encoding="utf-8") as handle:
                            json.dump({"text": text, "lang": lang, "segments": segments}, handle, ensure_ascii=False)
                    completed_chunks += 1
                    if lang and lang != "auto":
                        detected_lang = lang
                    if progress_callback:
                        progress_callback(
                            sum(len(item[2]) for item in results.values()),
                            completed_chunks * chunk_seconds,
                            max(len(chunks) * chunk_seconds, 1),
                        )

            ordered = [results[index] for index in sorted(results)]
            full_text = " ".join(item[0] for item in ordered).strip()
            all_segments = [segment for item in ordered for segment in item[2]]
            return full_text, detected_lang, all_segments
