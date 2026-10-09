import sys
import types

import pytest

from app.services import stt_whisperx


def test_module_imports_without_whisperx_dependency():
    # Importing the adapter must never require the heavy GPU deps.
    assert hasattr(stt_whisperx, "transcribe_whisperx")


def test_transcribe_raises_clear_error_when_whisperx_missing():
    # whisperx is not installed in CI/sandbox, so the adapter must raise a clear
    # RuntimeError (which the dispatch seam catches and falls back to local).
    with pytest.raises(RuntimeError, match="WhisperX is not installed"):
        stt_whisperx.transcribe_whisperx("clip.wav")


def _fake_whisperx(segments, *, language="ja", diarize_speakers=None):
    """A stand-in `whisperx` module so the env-independent output-shaping and
    diarization-wiring logic can be exercised without a GPU."""
    fake = types.ModuleType("whisperx")

    class _Model:
        def transcribe(self, audio, language=None):  # noqa: A002 - mirrors real API
            return {"language": language or "ja", "segments": segments}

    fake.load_model = lambda *a, **k: _Model()
    fake.load_audio = lambda path: "AUDIO"

    def _load_align_model(detected, device):
        raise RuntimeError("no align model in test")  # skip alignment branch

    fake.load_align_model = _load_align_model
    fake.align = lambda *a, **k: {"segments": segments}

    class _Diarize:
        def __call__(self, audio):
            return "DIAR"

    fake.DiarizationPipeline = lambda **k: _Diarize()

    def _assign(diar, result):
        if diarize_speakers is not None:
            for seg, speaker in zip(result["segments"], diarize_speakers):
                seg["speaker"] = speaker
        return result

    fake.assign_word_speakers = _assign
    return fake


def test_transcribe_normalizes_segments_and_drops_empty(monkeypatch):
    segments = [
        {"start": 0.123, "end": 1.789, "text": "こんにちは", "score": 0.912},
        {"start": 2.0, "end": 3.0, "text": "   ", "score": 0.5},  # empty -> dropped
        {"start": 3.0, "end": 4.44, "text": "テスト", "score": None},  # no score
    ]
    monkeypatch.setitem(sys.modules, "whisperx", _fake_whisperx(segments))
    monkeypatch.setattr(stt_whisperx.settings, "stt_diarization", False, raising=False)

    full_text, detected, out = stt_whisperx.transcribe_whisperx("clip.wav")

    assert detected == "ja"
    assert [s["text"] for s in out] == ["こんにちは", "テスト"]  # blank dropped
    assert out[0]["start"] == 0.12 and out[0]["end"] == 1.79  # rounded to 2dp
    assert out[0]["confidence"] == 0.912
    assert out[1]["confidence"] is None  # missing score stays None
    assert full_text == "こんにちは テスト"


def test_transcribe_applies_diarization_when_token_and_flag_set(monkeypatch):
    segments = [
        {"start": 0.0, "end": 1.0, "text": "A speaks", "score": 0.8},
        {"start": 1.0, "end": 2.0, "text": "B speaks", "score": 0.8},
    ]
    monkeypatch.setitem(
        sys.modules, "whisperx", _fake_whisperx(segments, diarize_speakers=["SPEAKER_00", "SPEAKER_01"])
    )
    monkeypatch.setattr(stt_whisperx.settings, "stt_diarization", True, raising=False)
    monkeypatch.setattr(stt_whisperx.settings, "huggingface_token", "hf_test", raising=False)

    _, _, out = stt_whisperx.transcribe_whisperx("clip.wav")

    assert [s["speaker"] for s in out] == ["SPEAKER_00", "SPEAKER_01"]


def test_transcribe_skips_diarization_without_token(monkeypatch):
    segments = [{"start": 0.0, "end": 1.0, "text": "hello", "score": 0.8}]
    monkeypatch.setitem(
        sys.modules, "whisperx", _fake_whisperx(segments, diarize_speakers=["SPEAKER_00"])
    )
    monkeypatch.setattr(stt_whisperx.settings, "stt_diarization", True, raising=False)
    monkeypatch.setattr(stt_whisperx.settings, "huggingface_token", "", raising=False)

    _, _, out = stt_whisperx.transcribe_whisperx("clip.wav")

    assert out[0]["speaker"] is None  # diarization not applied without a token
