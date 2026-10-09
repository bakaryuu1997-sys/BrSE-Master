from types import SimpleNamespace

import pytest

from app.core.config import settings
from app.services import transcriber
from app.services.transcriber import TranscriptionService


class _FakeSegment:
    """Mimics the OpenAI SDK verbose_json segment (attribute access)."""

    def __init__(self, start, end, text):
        self.start = start
        self.end = end
        self.text = text


class _FakeTranscriptions:
    def __init__(self, response):
        self._response = response
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return self._response


def _build_cloud_service(response):
    """Construct a cloud-mode service without touching OpenAI/WhisperModel."""
    service = TranscriptionService.__new__(TranscriptionService)
    service.mode = "cloud"
    fake = _FakeTranscriptions(response)
    service.client = SimpleNamespace(audio=SimpleNamespace(transcriptions=fake))
    return service, fake


def test_cloud_transcribe_parses_object_segments(tmp_path) -> None:
    audio = tmp_path / "clip.wav"
    audio.write_bytes(b"audio-bytes")
    response = SimpleNamespace(
        text="hello world",
        segments=[
            _FakeSegment(0.123, 1.987, " hello "),
            _FakeSegment(2.0, 3.456, "world"),
        ],
    )
    service, fake = _build_cloud_service(response)

    result, detected_lang, segments = service.transcribe(str(audio), language="en")

    assert result == "hello world"
    assert detected_lang == "en"
    assert segments == [
        {"start": 0.12, "end": 1.99, "text": "hello"},
        {"start": 2.0, "end": 3.46, "text": "world"},
    ]
    assert fake.calls[0]["model"] == settings.cloud_stt_model


def test_cloud_transcribe_parses_dict_segments(tmp_path) -> None:
    audio = tmp_path / "clip.wav"
    audio.write_bytes(b"audio")
    response = SimpleNamespace(
        text="hi",
        segments=[{"start": 1.0, "end": 2.0, "text": " hi "}],
    )
    service, _ = _build_cloud_service(response)

    _, _, segments = service.transcribe(str(audio), language="ja")

    assert segments == [{"start": 1.0, "end": 2.0, "text": "hi"}]


def test_cloud_transcribe_uses_configured_model(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(settings, "cloud_stt_model", "gpt-4o-transcribe")
    audio = tmp_path / "clip.wav"
    audio.write_bytes(b"audio")
    response = SimpleNamespace(text="ok", segments=[])
    service, fake = _build_cloud_service(response)

    service.transcribe(str(audio))

    assert fake.calls[0]["model"] == "gpt-4o-transcribe"


def test_cloud_transcribe_rejects_oversized_upload(tmp_path, monkeypatch) -> None:
    audio = tmp_path / "big.wav"
    audio.write_bytes(b"x")
    monkeypatch.setattr(
        transcriber.os.path,
        "getsize",
        lambda _p: transcriber.OPENAI_AUDIO_MAX_BYTES + 1,
    )
    response = SimpleNamespace(text="", segments=[])
    service, fake = _build_cloud_service(response)

    with pytest.raises(ValueError):
        service.transcribe(str(audio))

    assert fake.calls == []
