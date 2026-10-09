from app.services import stt_engines


class _FakeTranscriber:
    last_mode = None

    def __init__(self, mode="local", model_name=None):
        _FakeTranscriber.last_mode = mode
        self.mode = mode

    def transcribe(self, file_path, language=None, progress_callback=None, job_id=None):
        return (f"text-{self.mode}", "en", [{"start": 0, "end": 1, "text": "hi"}])


def test_local_dispatch(monkeypatch):
    monkeypatch.setattr(stt_engines, "TranscriptionService", _FakeTranscriber)
    text, lang, segments = stt_engines.transcribe_with_engine("local", "f.wav", model_name="small")
    assert _FakeTranscriber.last_mode == "local"
    assert text == "text-local"
    assert lang == "en"
    assert segments[0]["text"] == "hi"


def test_cloud_dispatch(monkeypatch):
    monkeypatch.setattr(stt_engines, "TranscriptionService", _FakeTranscriber)
    stt_engines.transcribe_with_engine("cloud", "f.wav")
    assert _FakeTranscriber.last_mode == "cloud"


def test_unknown_lazy_engine_falls_back_to_local(monkeypatch):
    monkeypatch.setattr(stt_engines, "TranscriptionService", _FakeTranscriber)
    text, _, _ = stt_engines.transcribe_with_engine("funasr", "f.wav")
    assert _FakeTranscriber.last_mode == "local"
    assert text == "text-local"


def test_whisperx_missing_dependency_falls_back_to_local(monkeypatch):
    monkeypatch.setattr(stt_engines, "TranscriptionService", _FakeTranscriber)
    # The whisperx dependency / stt_whisperx module is absent here, so the lazy
    # import raises and the seam must fall back to local rather than crash.
    text, _, _ = stt_engines.transcribe_with_engine("whisperx", "f.wav")
    assert _FakeTranscriber.last_mode == "local"
    assert text == "text-local"
